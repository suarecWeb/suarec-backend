import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateCompanyGalleryImageDto {
  @IsString()
  image_url: string;

  @IsString()
  image_path: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order_index?: number;
}

export class UpdateCompanyGalleryImageDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order_index?: number;
}

export class UploadCompanyGalleryImagesDto {
  @IsArray()
  @IsString({ each: true })
  image_urls: string[];

  @IsArray()
  @IsString({ each: true })
  image_paths: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class CompanyGalleryImageResponseDto {
  id: number;
  image_url: string;
  image_path: string;
  description?: string;
  order_index: number;
  created_at: Date;
} 