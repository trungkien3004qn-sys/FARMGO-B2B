import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AggregateOrdersDto, ScanCrateDto, AssignDriverDto } from './dto/logistics.dto';

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gom đơn lúc 22h hàng ngày thành chuyến xe Milk-run
   */
  async aggregateOrders(dto: AggregateOrdersDto) {
    const targetDate = new Date(dto.targetDate);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Tìm các đơn hàng đã thanh toán (PAID) cùng ngày và ca giao
    const paidOrders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        deliveryDate: { gte: targetDate, lt: nextDay },
        deliverySlot: dto.slot,
      },
      include: { items: true },
    });

    if (paidOrders.length === 0) {
      return { message: 'Không có đơn hàng mới nào cần gom cho ca này.', ordersCount: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      const shipmentCode = `SHIP-${dto.slot.slice(0, 1)}-${Date.now().toString().slice(-5)}`;
      const shipment = await tx.shipment.create({
        data: {
          shipmentCode,
          slot: dto.slot,
          scheduledDate: targetDate,
          status: 'PLANNING',
        },
      });

      // Tạo sọt hàng và gán đơn vào chuyến xe
      for (let i = 0; i < paidOrders.length; i++) {
        const order = paidOrders[i];
        const crateCode = `CRATE-${shipmentCode.slice(-4)}-${(i + 1).toString().padStart(2, '0')}`;

        await tx.shipmentOrder.create({
          data: {
            shipmentId: shipment.id,
            orderId: order.id,
            crateCode,
            sequence: i + 1,
          },
        });

        // Cập nhật trạng thái đơn thành AGGREGATED
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'AGGREGATED' },
        });
      }

      return {
        message: `Đã gom thành công ${paidOrders.length} đơn vào chuyến giao ${shipmentCode}`,
        shipment,
        aggregatedOrdersCount: paidOrders.length,
      };
    });
  }

  /**
   * Gán tài xế cho chuyến xe
   */
  async assignDriver(shipmentId: string, dto: AssignDriverDto) {
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        driverId: dto.driverId,
        status: 'IN_TRANSIT',
      },
    });
  }

  /**
   * Quét mã sọt hàng (Barcode/QR) cập nhật trạng thái giao
   */
  async scanCrate(dto: ScanCrateDto) {
    const shipmentOrder = await this.prisma.shipmentOrder.findFirst({
      where: { crateCode: dto.crateCode },
      include: { order: true },
    });
    if (!shipmentOrder) {
      throw new NotFoundException(`Không tìm thấy sọt hàng có mã ${dto.crateCode}`);
    }

    const newOrderStatus = dto.newStatus === 'DELIVERED' ? 'DELIVERED' : 'TRANSIT';
    await this.prisma.order.update({
      where: { id: shipmentOrder.orderId },
      data: {
        status: newOrderStatus,
        ...(dto.newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      },
    });

    return {
      message: `Đã cập nhật trạng thái sọt ${dto.crateCode} thành ${dto.newStatus}`,
      orderId: shipmentOrder.orderId,
      status: newOrderStatus,
    };
  }

  async getShipments(driverId?: string) {
    return this.prisma.shipment.findMany({
      where: driverId ? { driverId } : {},
      include: {
        orders: {
          include: {
            order: {
              include: {
                buyer: true,
                items: { include: { product: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }
}
