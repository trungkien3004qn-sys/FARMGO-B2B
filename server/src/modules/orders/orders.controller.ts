import { Controller, Get, Post, Patch, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders (Quản lý Đặt Hàng & Checkout)')
@Controller('api/orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Quán F&B đặt đơn hàng (Lưu trực tiếp vào SQLite dev.db + Khóa Escrow)' })
  checkout(@Request() req: any, @Body() dto: CreateOrderDto) {
    const buyerId = req.user?.id || dto.buyerId || 'customer-1';
    return this.ordersService.placeOrder(buyerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng từ Database SQLite dev.db' })
  findMyOrders(
    @Request() req: any,
    @Query('supplierId') supplierId?: string,
    @Query('buyerId') buyerId?: string,
  ) {
    const role = req.user?.role || (supplierId ? 'SUPPLIER' : buyerId ? 'BUYER' : 'ADMIN');
    const userId = req.user?.id || supplierId || buyerId || 'usr-admin-01';
    return this.ordersService.findOrders(userId, role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Xác nhận, Giao xe, Hoàn tất)' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đơn hàng' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
