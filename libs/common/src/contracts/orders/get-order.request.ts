import { IsUUID } from 'class-validator';
import { CorrelatedRequest } from '../correlated.request';

export class GetOrderRequest extends CorrelatedRequest {
  @IsUUID()
  id!: string;
}
