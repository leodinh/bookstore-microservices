import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookRequest {
  @IsString()
  @Length(1, 255)
  title!: string;

  @IsString()
  @Length(1, 200)
  author!: string;

  @IsString()
  @Length(10, 20)
  @Matches(/^[0-9Xx-]+$/)
  isbn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsInt()
  @Min(0)
  availableQuantity!: number;
}
