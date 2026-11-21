import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LogisticsService } from './logistics.service';
import { AggregateOrdersDto, ScanCrateDto, AssignDriverDto } from './dto/logistics.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/types/enums';

@ApiTags('Logistics (Gom Đơn 22h & Điều Phối Xe)')
@Controller('api/logistics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class LogisticsController {
  constructor(private logisticsService: LogisticsService) {}

  @Post('aggregate-22h')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Chốt ca gom đơn lúc 22h thành chuyến xe Milk-run (Sinh mã sọt tem)' })
  aggregateOrders(@Body() dto: AggregateOrdersDto) {
    return this.logisticsService.aggregateOrders(dto);
  }

  @Post('shipments/:id/assign-driver')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin gán tài xế vào chuyến xe' })
  assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.logisticsService.assignDriver(id, dto);
  }

  @Post('scan-crate')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({ summary: 'Tài xế quét mã QR/Barcode trên sọt để cập nhật giao hàng' })
  scanCrate(@Body() dto: ScanCrateDto) {
    return this.logisticsService.scanCrate(dto);
  }

  @Get('shipments')
  @ApiOperation({ summary: 'Lấy danh sách các chuyến xe giao hàng' })
  getShipments(@Request() req: any) {
    const driverId = req.user.role === 'DRIVER' ? req.user.id : undefined;
    return this.logisticsService.getShipments(driverId);
  }
}
