import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CorrelatedRequest } from '../correlated.request';

export class CreateOrderItemRequest {
  @IsUUID()
  bookId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderRequest extends CorrelatedRequest {
  @IsUUID()
  idempotencyKey!: string;

  @IsUUID()
  userId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemRequest)
  items!: CreateOrderItemRequest[];
}
