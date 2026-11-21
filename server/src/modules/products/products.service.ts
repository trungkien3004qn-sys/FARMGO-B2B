import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }
    return product;
  }

  async create(supplierId: string, dto: any) {
    const id = dto.id || `prod-${Date.now().toString().slice(-6)}`;
    return this.prisma.product.create({
      data: {
        id,
        name: dto.name,
        category: dto.category || 'TRAI_CAY',
        unit: dto.unit || 'kg',
        priceVnd: Number(dto.priceVnd) || 20000,
        stockKg: Number(dto.stockKg) || 100,
        origin: dto.origin || 'Việt Nam',
        storageTemp: dto.storageTemp || '15-20°C',
        shelfLifeDays: Number(dto.shelfLifeDays) || 7,
        imageUrl: dto.imageUrl || '',
        isActive: dto.isActive !== false,
        supplierId: dto.supplierId || supplierId || 'supplier-1',
      },
    });
  }

  async update(id: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.priceVnd !== undefined) data.priceVnd = Number(dto.priceVnd);
    if (dto.stockKg !== undefined) data.stockKg = Number(dto.stockKg);
    if (dto.origin !== undefined) data.origin = dto.origin;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);
    if (dto.category !== undefined) data.category = dto.category;

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch {
      return await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }
  }

  async updateStock(id: string, stockKg: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stockKg },
    });
  }
}
