import { IsUUID } from 'class-validator';

export class GetBookRequest {
  @IsUUID()
  id!: string;
}
