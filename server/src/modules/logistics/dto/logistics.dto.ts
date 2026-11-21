import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliverySlot } from '../../../common/types/enums';

export class AggregateOrdersDto {
  @ApiProperty({ example: '2026-11-16' })
  @IsString()
  @IsNotEmpty()
  targetDate: string;

  @ApiProperty({ example: DeliverySlot.MORNING, enum: DeliverySlot })
  @IsEnum(DeliverySlot)
  slot: DeliverySlot;
}

export class ScanCrateDto {
  @ApiProperty({ example: 'CRATE-FG-001', description: 'Mã vạch / QR trên sọt hàng' })
  @IsString()
  @IsNotEmpty()
  crateCode: string;

  @ApiProperty({ example: 'DELIVERED', enum: ['IN_TRANSIT', 'DELIVERED'] })
  @IsString()
  @IsNotEmpty()
  newStatus: string;
}

export class AssignDriverDto {
  @ApiProperty({ example: 'usr-driver-01' })
  @IsString()
  @IsNotEmpty()
  driverId: string;
}
