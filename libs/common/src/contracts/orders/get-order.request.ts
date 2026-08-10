import { IsUUID } from 'class-validator';

export class GetOrderRequest {
  @IsUUID()
  id!: string;
}
