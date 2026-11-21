import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePickupDto, CompleteWeighingDto, RedeemVoucherDto } from './dto/green.dto';

@Injectable()
export class GreenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Quán F&B đăng ký yêu cầu thu gom rác hữu cơ
   */
  async createPickup(buyerId: string, dto: CreatePickupDto) {
    return this.prisma.greenPickup.create({
      data: {
        buyerId,
        wasteType: dto.wasteType,
        expectedKg: dto.expectedKg,
        status: 'WAITING',
      },
    });
  }

  /**
   * HTX xác nhận tiếp nhận đơn thu gom
   */
  async confirmPickup(pickupId: string) {
    const pickup = await this.prisma.greenPickup.findUnique({ where: { id: pickupId } });
    if (!pickup) throw new NotFoundException('Không tìm thấy yêu cầu thu gom.');

    return this.prisma.greenPickup.update({
      where: { id: pickupId },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * HTX điều xe đến quán
   */
  async dispatchPickup(pickupId: string) {
    return this.prisma.greenPickup.update({
      where: { id: pickupId },
      data: { status: 'EN_ROUTE' },
    });
  }

  /**
   * Cân thực tế tại quán, xác nhận OTP/QR và tích Điểm Xanh (2.000đ/kg)
   */
  async completeWeighing(pickupId: string, dto: CompleteWeighingDto) {
    const pickup = await this.prisma.greenPickup.findUnique({ where: { id: pickupId } });
    if (!pickup) throw new NotFoundException('Không tìm thấy yêu cầu thu gom.');
    if (pickup.status === 'COMPLETE' || pickup.status === 'RECEIVED') {
      return { message: 'Yêu cầu này đã được cân và tích điểm trước đó.', pickup };
    }

    const earnedPoints = dto.actualKg * 2000; // Quy đổi: 1 kg rác hữu cơ = 2.000 Điểm Xanh

    const updated = await this.prisma.greenPickup.update({
      where: { id: pickupId },
      data: {
        actualKg: dto.actualKg,
        earnedPoints,
        status: 'COMPLETE',
      },
    });

    return {
      message: `Đã cân xong ${dto.actualKg} kg. Cộng thành công ${earnedPoints.toLocaleString('vi-VN')} Điểm Xanh cho quán!`,
      pickup: updated,
    };
  }

  /**
   * HTX nhập xưởng để sản xuất phân hữu cơ
   */
  async receiveAtFactory(pickupId: string) {
    return this.prisma.greenPickup.update({
      where: { id: pickupId },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Quán dùng Điểm Xanh đổi Voucher giảm giá vận chuyển (50k hoặc 100k)
   */
  async redeemVoucher(buyerId: string, dto: RedeemVoucherDto) {
    const pointsRequired = dto.discountVnd; // 50.000 điểm = 50.000đ voucher

    // Tính tổng điểm xanh tích lũy của quán
    const pickups = await this.prisma.greenPickup.findMany({
      where: { buyerId, status: { in: ['COMPLETE', 'RECEIVED'] } },
    });
    const totalEarnedPoints = pickups.reduce((sum, p) => sum + p.earnedPoints, 0);

    // Tính điểm đã dùng đổi voucher
    const usedVouchers = await this.prisma.greenVoucher.findMany({
      where: { buyerId },
    });
    const totalSpentPoints = usedVouchers.reduce((sum, v) => sum + v.pointsSpent, 0);

    const availablePoints = totalEarnedPoints - totalSpentPoints;
    if (availablePoints < pointsRequired) {
      throw new BadRequestException(
        `Không đủ Điểm Xanh. Bạn có ${availablePoints.toLocaleString('vi-VN')} điểm, cần ${pointsRequired.toLocaleString('vi-VN')} điểm.`
      );
    }

    const voucher = await this.prisma.greenVoucher.create({
      data: {
        buyerId,
        discountVnd: dto.discountVnd,
        pointsSpent: pointsRequired,
      },
    });

    return {
      message: `Đổi thành công Voucher giảm ${dto.discountVnd.toLocaleString('vi-VN')} đ phí vận chuyển!`,
      voucher,
      remainingPoints: availablePoints - pointsRequired,
    };
  }

  async getMyPickups(buyerId: string) {
    const pickups = await this.prisma.greenPickup.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
    const vouchers = await this.prisma.greenVoucher.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });

    const totalPoints = pickups
      .filter((p) => p.status === 'COMPLETE' || p.status === 'RECEIVED')
      .reduce((sum, p) => sum + p.earnedPoints, 0);
    const spentPoints = vouchers.reduce((sum, v) => sum + v.pointsSpent, 0);

    return {
      totalPoints,
      availablePoints: totalPoints - spentPoints,
      pickups,
      vouchers,
    };
  }

  async getAllPickups() {
    return this.prisma.greenPickup.findMany({
      include: { buyer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
