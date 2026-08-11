import { IsUUID } from 'class-validator';
import { CorrelatedRequest } from '../correlated.request';

export class ListUserOrdersRequest extends CorrelatedRequest {
  @IsUUID()
  userId!: string;
}
