import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePickupDto {
  @ApiProperty({ example: 'Bã cà phê hữu cơ', description: 'Loại rác hữu cơ quán gom được' })
  @IsString()
  @IsNotEmpty()
  wasteType: string;

  @ApiProperty({ example: 25, description: 'Khối lượng ước tính (kg)' })
  @IsNumber()
  @Min(1)
  expectedKg: number;
}

export class CompleteWeighingDto {
  @ApiProperty({ example: 26, description: 'Số kg cân thực tế tại quán' })
  @IsNumber()
  @Min(1)
  actualKg: number;

  @ApiProperty({ example: '123456', description: 'Mã OTP xác thực bàn giao giữa quán và HTX' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class RedeemVoucherDto {
  @ApiProperty({ example: 50000, enum: [50000, 100000], description: 'Mệnh giá voucher 50.000đ hoặc 100.000đ' })
  @IsNumber()
  discountVnd: number;
}
