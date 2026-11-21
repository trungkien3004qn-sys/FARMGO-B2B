import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GreenService } from './green.service';
import { CreatePickupDto, CompleteWeighingDto, RedeemVoucherDto } from './dto/green.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/types/enums';

@ApiTags('Farmgo Green (Kinh Tế Tuần Hoàn & Điểm Xanh)')
@Controller('api/green')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class GreenController {
  constructor(private greenService: GreenService) {}

  @Post('pickups')
  @Roles(Role.BUYER)
  @ApiOperation({ summary: 'Quán F&B đăng ký yêu cầu thu gom rác hữu cơ (Bã cà phê, vỏ trái cây)' })
  createPickup(@Request() req: any, @Body() dto: CreatePickupDto) {
    return this.greenService.createPickup(req.user.id, dto);
  }

  @Post('pickups/:id/confirm')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'HTX xác nhận tiếp nhận yêu cầu' })
  confirmPickup(@Param('id') id: string) {
    return this.greenService.confirmPickup(id);
  }

  @Post('pickups/:id/dispatch')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'HTX điều xe thu gom đến quán' })
  dispatchPickup(@Param('id') id: string) {
    return this.greenService.dispatchPickup(id);
  }

  @Post('pickups/:id/complete')
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Cân thực tế tại quán, nhập OTP/QR và tích Điểm Xanh (2.000đ/kg)' })
  completeWeighing(@Param('id') id: string, @Body() dto: CompleteWeighingDto) {
    return this.greenService.completeWeighing(id, dto);
  }

  @Post('pickups/:id/receive')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'HTX xác nhận nhập rác vào xưởng làm phân hữu cơ' })
  receiveAtFactory(@Param('id') id: string) {
    return this.greenService.receiveAtFactory(id);
  }

  @Post('vouchers/redeem')
  @Roles(Role.BUYER)
  @ApiOperation({ summary: 'Quán đổi Điểm Xanh lấy Voucher giảm giá vận chuyển' })
  redeemVoucher(@Request() req: any, @Body() dto: RedeemVoucherDto) {
    return this.greenService.redeemVoucher(req.user.id, dto);
  }

  @Get('my-summary')
  @Roles(Role.BUYER)
  @ApiOperation({ summary: 'Xem số dư Điểm Xanh và lịch sử thu gom của quán' })
  getMySummary(@Request() req: any) {
    return this.greenService.getMyPickups(req.user.id);
  }

  @Get('all-pickups')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách toàn bộ yêu cầu thu gom cho HTX quản lý' })
  getAllPickups() {
    return this.greenService.getAllPickups();
  }
}
