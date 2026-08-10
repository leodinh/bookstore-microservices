import { IsUUID } from 'class-validator';

export class ListUserOrdersRequest {
  @IsUUID()
  userId!: string;
}
