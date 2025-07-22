import { IsOptional, IsString, IsNumber, IsUrl, MaxLength, IsArray, IsDateString } from "class-validator";

export class UpdatePublicationDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

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

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  gallery_images?: string[];

  @IsDateString()
  @IsOptional()
  modified_at?: string;
}
