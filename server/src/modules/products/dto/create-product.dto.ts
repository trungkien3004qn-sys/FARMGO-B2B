import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'prod-001', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'supplier-1', required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ example: 'Bơ sáp 034 Lâm Đồng' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'TRAI_CAY', enum: ['TRAI_CAY', 'RAU_CU', 'GIA_VI'], required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'kg', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 22000, description: 'Giá bán VND/kg' })
  @IsNumber()
  @Min(0)
  priceVnd: number;

  @ApiProperty({ example: 500, description: 'Sản lượng tồn kho sẵn sàng bán (kg)' })
  @IsNumber()
  @Min(0)
  stockKg: number;

  @ApiProperty({ example: 'Đức Trọng, Lâm Đồng', required: false })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({ example: '10-15°C', required: false })
  @IsOptional()
  @IsString()
  storageTemp?: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  shelfLifeDays?: number;

  @ApiProperty({ example: '/product-photos/avocado-034.webp', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
