import { IsUUID } from 'class-validator';

export abstract class CorrelatedRequest {
  @IsUUID()
  correlationId!: string;
}
