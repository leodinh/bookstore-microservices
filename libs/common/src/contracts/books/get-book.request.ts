import { IsUUID } from 'class-validator';
import { CorrelatedRequest } from '../correlated.request';

export class GetBookRequest extends CorrelatedRequest {
  @IsUUID()
  id!: string;
}
