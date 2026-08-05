import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { OrdersServiceController } from './orders-service.controller';
import { OrdersServiceService } from './orders-service.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersServiceController],
  providers: [OrdersServiceService],
})
export class OrdersServiceModule {}
