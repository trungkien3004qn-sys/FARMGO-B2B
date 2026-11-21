import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { GreenModule } from './modules/green/green.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    EscrowModule,
    LogisticsModule,
    GreenModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
