import { All, Body, Controller, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('api/*path')
  dispatch(@Req() request: Request, @Body() body: unknown) {
    return this.apiGatewayService.dispatch({
      method: request.method,
      path: request.path,
      body,
      query: request.query,
      headers: {
        'idempotency-key': request.get('Idempotency-Key'),
      },
    });
  }
}
