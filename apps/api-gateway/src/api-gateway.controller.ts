import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateBookRequest,
  CreateOrderRequest,
  SignupUserRequest,
  UpdateBookBodyRequest,
} from '@app/common';
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get('api/books/catalog')
  getBookCatalog() {
    return this.apiGatewayService.getBookCatalog();
  }

  @Get('api/books/:id')
  getBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiGatewayService.getBook(id);
  }

  @Post('api/books')
  createBook(@Body() request: CreateBookRequest) {
    return this.apiGatewayService.createBook(request);
  }

  @Put('api/books/:id')
  updateBook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateBookBodyRequest,
  ) {
    return this.apiGatewayService.updateBook(id, request);
  }

  @Delete('api/books/:id')
  deactivateBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiGatewayService.deactivateBook(id);
  }

  @Post('api/users/signup')
  signup(@Body() request: SignupUserRequest) {
    return this.apiGatewayService.signup(request);
  }

  @Post('api/orders')
  createOrder(@Body() request: CreateOrderRequest) {
    return this.apiGatewayService.createOrder(request);
  }

  @Get('api/orders/user/:userId')
  listUserOrders(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.apiGatewayService.listUserOrders(userId);
  }

  @Get('api/orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiGatewayService.getOrder(id);
  }
}
