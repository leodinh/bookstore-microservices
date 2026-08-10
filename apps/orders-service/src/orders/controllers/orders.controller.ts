import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateOrderRequest,
  GetOrderRequest,
  ListUserOrdersRequest,
  MESSAGE_PATTERNS,
} from '@app/common';
import { OrdersService } from '../services/orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(MESSAGE_PATTERNS.orders.order.create)
  createOrder(@Payload() request: CreateOrderRequest) {
    return this.ordersService.createOrder(request);
  }

  @MessagePattern(MESSAGE_PATTERNS.orders.order.get)
  getOrder(@Payload() request: GetOrderRequest) {
    return this.ordersService.getOrder(request.id);
  }

  @MessagePattern(MESSAGE_PATTERNS.orders.user.list)
  listUserOrders(@Payload() request: ListUserOrdersRequest) {
    return this.ordersService.listUserOrders(request.userId);
  }
}
