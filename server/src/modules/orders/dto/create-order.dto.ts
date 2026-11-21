import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { DeliverySlot } from '../../../common/types/enums';

export class OrderItemDto {
  @ApiProperty({ example: 'avocado-034' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'supplier-1' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ example: 'Bơ Sáp 034 Bảo Lộc', required: false })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 10, description: 'Số lượng mua (kg)' })
  @IsNumber()
  @Min(1)
  quantityKg: number;

  @ApiProperty({ example: 22000, description: 'Đơn giá VND/kg' })
  @IsNumber()
  @Min(0)
  unitPriceVnd: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-1', required: false })
  @IsOptional()
  @IsString()
  buyerId?: string;

  @ApiProperty({ example: 'req-key-261115-001', description: 'Idempotency Key chống đặt trùng đơn' })
  @IsString()
  @IsNotEmpty()
  requestKey: string;

  @ApiProperty({ example: '2026-11-16' })
  @IsString()
  deliveryDate: string;

  @ApiProperty({ example: DeliverySlot.MORNING, enum: DeliverySlot })
  @IsEnum(DeliverySlot)
  deliverySlot: DeliverySlot;

  @ApiProperty({ example: 'SINGLE', enum: ['SINGLE', 'GROUP'], required: false })
  @IsOptional()
  @IsString()
  orderMode?: string;

  @ApiProperty({ example: 25000, description: 'Phí giao hàng VND' })
  @IsNumber()
  @Min(0)
  shippingFeeVnd: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  discountVnd?: number;

  @ApiProperty({ example: 245000, description: 'Tổng tiền phải thanh toán VND' })
  @IsNumber()
  @Min(0)
  totalVnd: number;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
