import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Cho phép Frontend Vite kết nối CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });

  // 2. Tự động validate dữ liệu DTO đầu vào
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // 3. Tích hợp Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('FARMGO B2B Enterprise API')
    .setDescription(
      'Hệ thống API Backend Nền tảng Nông sản B2B, Ký Quỹ Escrow, Điều Phối Gom Đơn 22h & Kinh Tế Tuần Hoàn FARMGO Green.'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token lấy từ API /api/auth/login',
        in: 'header',
      },
      'JWT'
    )
    .addTag('Auth (Xác thực & Phân quyền)', 'Đăng ký, Đăng nhập và lấy thông tin Profile 4 vai trò')
    .addTag('Products (Chợ Nông Sản B2B)', 'Xem danh mục, giá True-Cost và nhà vườn đăng bán')
    .addTag('Orders (Quản lý Đặt Hàng & Checkout)', 'Đặt đơn với Idempotency, trừ tồn kho và tạo Escrow')
    .addTag('Escrow & Finance (Tài Chính & Ký Quỹ)', 'Sổ cái kép, giải ngân 3% hoa hồng, khiếu nại đền bù và rút tiền')
    .addTag('Logistics (Gom Đơn 22h & Điều Phối Xe)', 'Chốt ca gom 22h, gán tuyến xe và quét mã QR sọt')
    .addTag('Farmgo Green (Kinh Tế Tuần Hoàn & Điểm Xanh)', 'Thu gom rác hữu cơ, cân thực tế, tích Điểm Xanh và đổi voucher')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'FARMGO B2B API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`\n======================================================`);
  console.log(`🚀 FARMGO Backend Server is running on: http://localhost:${port}`);
  console.log(`📚 Swagger OpenAPI Documentation:      http://localhost:${port}/api/docs`);
  console.log(`======================================================\n`);
}

bootstrap();
