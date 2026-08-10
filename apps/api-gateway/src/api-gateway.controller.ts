import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
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
}
