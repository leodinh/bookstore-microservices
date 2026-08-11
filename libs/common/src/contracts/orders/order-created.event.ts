import {
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class OrderCreatedEvent {
  @IsUUID()
  eventId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsUUID()
  correlationId!: string;

  @IsUUID()
  orderId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  status!: string;

  @Matches(/^\d+\.\d{2}$/)
  totalAmount!: string;

  @IsInt()
  @Min(1)
  itemCount!: number;
}
