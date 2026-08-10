import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemRequest {
  @IsUUID()
  bookId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderRequest {
  @IsUUID()
  userId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemRequest)
  items!: CreateOrderItemRequest[];
}
