import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EscrowService } from './escrow.service';
import { SettleEscrowDto, CreateClaimDto, ReviewClaimDto, RequestWithdrawalDto } from './dto/escrow.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/types/enums';

@ApiTags('Escrow & Finance (Tài Chính & Ký Quỹ)')
@Controller('api/escrow')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class EscrowController {
  constructor(private escrowService: EscrowService) {}

  @Post('settle')
  @Roles(Role.ADMIN, Role.BUYER)
  @ApiOperation({ summary: 'Admin hoặc Quán F&B nghiệm thu giải ngân tiền ký quỹ cho nhà vườn (Khấu trừ 7% hoa hồng sàn)' })
  settleEscrow(@Body() dto: SettleEscrowDto) {
    return this.escrowService.settleEscrow(dto);
  }

  @Post('claims')
  @Roles(Role.BUYER)
  @ApiOperation({ summary: 'Quán F&B gửi khiếu nại yêu cầu bồi thường nông sản hỏng' })
  createClaim(@Request() req: any, @Body() dto: CreateClaimDto) {
    return this.escrowService.createClaim(req.user.id, dto);
  }

  @Post('claims/:id/review')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin duyệt / từ chối khiếu nại (Tự động hoàn tiền vào ví khách)' })
  reviewClaim(@Param('id') id: string, @Body() dto: ReviewClaimDto) {
    return this.escrowService.reviewClaim(id, dto);
  }

  @Post('withdrawals')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Nhà vườn gửi yêu cầu rút tiền về ngân hàng' })
  requestWithdrawal(@Request() req: any, @Body() dto: RequestWithdrawalDto) {
    return this.escrowService.requestWithdrawal(req.user.id, dto);
  }

  @Get('finance')
  @ApiOperation({ summary: 'Báo cáo tài chính, tổng tiền giữ, giải ngân và sổ cái' })
  getFinance(@Request() req: any) {
    return this.escrowService.getFinanceOverview(req.user.id, req.user.role);
  }
}
