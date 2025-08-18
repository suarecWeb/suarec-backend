import { IsString, IsOptional, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateIdPhotoDto {
  @ApiProperty({ description: "URL de la imagen" })
  @IsString()
  @IsNotEmpty()
  image_url: string;

  @ApiProperty({ description: "Ruta de la imagen en el servidor" })
  @IsString()
  @IsNotEmpty()
  image_path: string;

  @ApiProperty({ description: "Descripción opcional de la imagen", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Tipo de foto de cédula",
    enum: ["front", "back"],
    example: "front"
  })
  @IsEnum(["front", "back"])
  @IsNotEmpty()
  photo_type: "front" | "back";
}

export class UpdateIdPhotoDto {
  @ApiProperty({ description: "URL de la imagen", required: false })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiProperty({ description: "Ruta de la imagen en el servidor", required: false })
  @IsString()
  @IsOptional()
  image_path?: string;

  @ApiProperty({ description: "Descripción opcional de la imagen", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Estado de la foto",
    enum: ["pending", "approved", "rejected"],
    required: false
  })
  @IsEnum(["pending", "approved", "rejected"])
  @IsOptional()
  status?: "pending" | "approved" | "rejected";

  @ApiProperty({ description: "ID del revisor", required: false })
  @IsString()
  @IsOptional()
  reviewed_by?: number;

  @ApiProperty({
    description: "Tipo de foto de cédula",
    enum: ["front", "back"],
    required: false
  })
  @IsEnum(["front", "back"])
  @IsOptional()
  photo_type?: "front" | "back";
}

export class ReviewIdPhotoDto {
  @ApiProperty({
    description: "Estado de revisión",
    enum: ["approved", "rejected"]
  })
  @IsEnum(["approved", "rejected"])
  @IsNotEmpty()
  status: "approved" | "rejected";

  @ApiProperty({ description: "Comentarios de la revisión", required: false })
  @IsString()
  @IsOptional()
  description?: string;
}