import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettleEscrowDto, CreateClaimDto, ReviewClaimDto, RequestWithdrawalDto } from './dto/escrow.dto';

@Injectable()
export class EscrowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Giải ngân tiền ký quỹ (Sau khi đơn hàng giao thành công và quán nghiệm thu QC)
   * Phân chia dòng doanh thu theo đề án:
   * 1. Hoa hồng sàn từ Nhà cung cấp: 7% -> Nhà vườn thực nhận 93%
   * 2. Hoa hồng sàn từ Đối tác vận chuyển: 4% -> Tài xế thực nhận 96%
   * 3. Hoa hồng từ Bảo hiểm: 0.5% (nếu có)
   */
  async settleEscrow(dto: SettleEscrowDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: dto.orderId },
          { orderCode: dto.orderId },
          { requestKey: dto.orderId },
        ],
      },
      include: { escrowAllocations: true },
    });
    const effectiveOrderId = order?.id || dto.orderId;

    const allocation = await this.prisma.escrowAllocation.findFirst({
      where: { orderId: effectiveOrderId, supplierId: dto.supplierId },
    });
    if (!allocation) {
      throw new NotFoundException('Không tìm thấy bản ghi ký quỹ cho đơn hàng và nhà vườn này.');
    }
    if (allocation.status === 'SETTLED') {
      return { message: 'Khoản tiền này đã được giải ngân trước đó.', allocation };
    }

    return this.prisma.$transaction(async (tx) => {
      const netGoods = Math.max(0, allocation.goodsVnd - allocation.refundedVnd);
      const feeVnd = Math.round((netGoods * 7) / 100); // 7% hoa hồng sàn từ Nhà cung cấp
      const supplierNetVnd = Math.max(0, netGoods - feeVnd);

      const updatedAllocation = await tx.escrowAllocation.update({
        where: { id: allocation.id },
        data: {
          feeVnd,
          supplierNetVnd,
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });

      // Ghi Sổ cái SETTLEMENT cho nhà vườn (93% tiền hàng, 7% phí sàn)
      await tx.ledgerEntry.create({
        data: {
          kind: 'SETTLEMENT',
          orderId: effectiveOrderId,
          supplierId: dto.supplierId,
          amountVnd: supplierNetVnd,
          feeVnd,
          note: `Giải ngân tiền bán hàng (Đã trừ ${feeVnd.toLocaleString('vi-VN')} đ phí hoa hồng sàn 7%)`,
        },
      });

      // Nếu đơn có cước vận chuyển, ghi nhận rã cước tài xế (96% cước, 4% hoa hồng sàn)
      if (order && order.shippingFeeVnd > 0) {
        const shippingFee = order.shippingFeeVnd;
        const driverCommission = Math.round((shippingFee * 4) / 100); // 4% hoa hồng từ vận chuyển
        const driverNet = shippingFee - driverCommission;
        await tx.ledgerEntry.create({
          data: {
            kind: 'SETTLEMENT',
            orderId: effectiveOrderId,
            amountVnd: driverNet,
            feeVnd: driverCommission,
            note: `Giải ngân cước vận chuyển tài xế (Đã trừ ${driverCommission.toLocaleString('vi-VN')} đ phí nền tảng 4%)`,
          },
        });
      }

      return {
        message: 'Giải ngân ký quỹ thành công cho nhà vườn và tài xế',
        allocation: updatedAllocation,
        supplierNetVnd,
        supplierFeeVnd: feeVnd,
      };
    });
  }

  /**
   * Quán F&B gửi khiếu nại đền bù hàng hỏng
   */
  async createClaim(buyerId: string, dto: CreateClaimDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });
    if (!order || order.buyerId !== buyerId) {
      throw new BadRequestException('Đơn hàng không thuộc về tài khoản này.');
    }

    return this.prisma.claim.create({
      data: {
        orderId: dto.orderId,
        buyerId,
        damagedKg: dto.damagedKg,
        refundAmountVnd: dto.refundAmountVnd,
        reason: dto.reason,
        photoUrl: dto.photoUrl,
        status: 'OPEN',
      },
    });
  }

  /**
   * Admin duyệt hoặc từ chối khiếu nại
   */
  async reviewClaim(claimId: string, dto: ReviewClaimDto) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { order: { include: { escrowAllocations: true } } },
    });
    if (!claim) {
      throw new NotFoundException('Không tìm thấy khiếu nại.');
    }
    if (claim.status !== 'OPEN') {
      throw new BadRequestException('Khiếu nại này đã được xử lý trước đó.');
    }

    return this.prisma.$transaction(async (tx) => {
      const status = dto.approved ? 'APPROVED' : 'REJECTED';
      const updatedClaim = await tx.claim.update({
        where: { id: claimId },
        data: {
          status,
          resolvedAt: new Date(),
        },
      });

      // Nếu chấp thuận duyệt hoàn tiền
      if (dto.approved) {
        // Cập nhật allocation
        const allocation = claim.order.escrowAllocations[0];
        if (allocation && allocation.status === 'HELD') {
          await tx.escrowAllocation.update({
            where: { id: allocation.id },
            data: {
              refundedVnd: { increment: claim.refundAmountVnd },
            },
          });
        }

        // Ghi sổ cái REFUND
        await tx.ledgerEntry.create({
          data: {
            kind: 'REFUND',
            orderId: claim.orderId,
            amountVnd: claim.refundAmountVnd,
            note: `Hoàn tiền bồi thường dập nát: ${claim.reason}`,
          },
        });
      }

      return {
        message: dto.approved ? 'Đã duyệt bồi thường và hoàn tiền vào ví khách' : 'Đã từ chối khiếu nại',
        claim: updatedClaim,
      };
    });
  }

  /**
   * Nhà vườn tạo yêu cầu rút tiền về tài khoản ngân hàng
   */
  async requestWithdrawal(supplierId: string, dto: RequestWithdrawalDto) {
    return this.prisma.withdrawal.create({
      data: {
        supplierId,
        amountVnd: dto.amountVnd,
        bankName: dto.bankName,
        accountNo: dto.accountNo,
        status: 'PENDING',
      },
    });
  }

  /**
   * Báo cáo Tài chính & Sổ cái Sàn
   */
  async getFinanceOverview(userId: string, role: string) {
    const ledger = await this.prisma.ledgerEntry.findMany({
      where: role === 'SUPPLIER' ? { supplierId: userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const allocations = await this.prisma.escrowAllocation.findMany({
      where: role === 'SUPPLIER' ? { supplierId: userId } : {},
      include: { order: true },
      orderBy: { order: { createdAt: 'desc' } },
    });

    const totalHeld = allocations
      .filter((a) => a.status === 'HELD')
      .reduce((sum, a) => sum + a.goodsVnd - a.refundedVnd, 0);

    const totalSettled = allocations
      .filter((a) => a.status === 'SETTLED')
      .reduce((sum, a) => sum + a.supplierNetVnd, 0);

    const totalPlatformFee = allocations
      .filter((a) => a.status === 'SETTLED')
      .reduce((sum, a) => sum + a.feeVnd, 0);

    return {
      summary: {
        totalHeldVnd: totalHeld,
        totalSettledVnd: totalSettled,
        totalPlatformFeeVnd: totalPlatformFee,
      },
      allocations,
      recentLedgerEntries: ledger,
    };
  }
}
