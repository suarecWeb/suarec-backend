import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateGalleryImageDto {
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

export class UpdateGalleryImageDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order_index?: number;
}

export class UploadGalleryImagesDto {
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

export class GalleryImageResponseDto {
  id: number;
  image_url: string;
  image_path: string;
  description?: string;
  order_index: number;
  created_at: Date;
}
