import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('Products (Chợ Nông Sản B2B)')
@Controller('api/products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh mục nông sản đang mở bán (Public)' })
  @ApiQuery({ name: 'category', required: false, enum: ['TRAI_CAY', 'RAU_CU', 'GIA_VI'] })
  findAll(@Query('category') category?: string) {
    return this.productsService.findAll(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết nông sản' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Nhà vườn đăng bán lô hàng mới (Lưu trực tiếp vào SQLite dev.db)' })
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    const supplierId = req.user?.id || dto.supplierId || 'supplier-1';
    return this.productsService.create(supplierId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nông sản (Giá, Tồn kho, Trạng thái mở bán)' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nông sản khỏi sàn' })
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
