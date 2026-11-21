import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SettleEscrowDto {
  @ApiProperty({ example: 'ord-demo-01' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'supplier-1' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;
}

export class CreateClaimDto {
  @ApiProperty({ example: 'ord-demo-01' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 2, description: 'Số kg nông sản dập hỏng' })
  @IsNumber()
  @Min(1)
  damagedKg: number;

  @ApiProperty({ example: 44000, description: 'Số tiền yêu cầu hoàn lại' })
  @IsNumber()
  @Min(1)
  refundAmountVnd: number;

  @ApiProperty({ example: 'Nông sản bị dập nát do va đập trong thùng xe' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'https://example.com/photo-damaged.jpg', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class ReviewClaimDto {
  @ApiProperty({ example: true, description: 'true: Duyệt hoàn tiền, false: Từ chối' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ example: 'Đã xác minh qua ảnh chụp đối chiếu của tài xế', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RequestWithdrawalDto {
  @ApiProperty({ example: 500000, description: 'Số tiền VND muốn rút' })
  @IsNumber()
  @Min(50000)
  amountVnd: number;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  accountNo: string;
}
