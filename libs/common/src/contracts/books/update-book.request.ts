import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBookBodyRequest {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  author?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(/^[0-9Xx-]+$/)
  isbn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;
}

export class UpdateBookRequest extends UpdateBookBodyRequest {
  @IsUUID()
  correlationId!: string;

  @IsUUID()
  id!: string;
}
