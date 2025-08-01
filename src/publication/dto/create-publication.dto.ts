import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsArray,
} from "class-validator";

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  created_at: string;

  @IsDateString()
  @IsNotEmpty()
  modified_at: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string; // 'SERVICE', 'JOB', etc. - Optional para compatibility

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsNumber()
  @IsOptional()
  visitors?: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  priceUnit?: string;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  gallery_images?: string[];
}
