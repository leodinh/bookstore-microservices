import { IsUUID } from 'class-validator';
import { CorrelatedRequest } from '../correlated.request';

export class GetUserRequest extends CorrelatedRequest {
  @IsUUID()
  id!: string;
}
