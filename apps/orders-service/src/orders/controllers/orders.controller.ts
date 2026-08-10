import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderRequest, MESSAGE_PATTERNS } from '@app/common';
import { OrdersService } from '../services/orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(MESSAGE_PATTERNS.orders.order.create)
  createOrder(@Payload() request: CreateOrderRequest) {
    return this.ordersService.createOrder(request);
  }
}
