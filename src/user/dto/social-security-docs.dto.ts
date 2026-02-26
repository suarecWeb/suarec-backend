import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { SocialSecurityDocumentType } from "../entities/social-security-document.entity";

export const MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES = 10 * 1024 * 1024;

export class RequestSocialSecurityUploadUrlDto {
  @ApiProperty({
    description: "Tipo de documento de seguridad social",
    enum: ["eps", "pension", "arl", "aportes"],
  })
  @IsEnum(SocialSecurityDocumentType)
  @IsNotEmpty()
  document_type: SocialSecurityDocumentType;

  @ApiProperty({ description: "Nombre del archivo PDF" })
  @IsString()
  @IsNotEmpty()
  @Matches(/\.pdf$/i, { message: "El archivo debe tener extensión .pdf" })
  filename: string;

  @ApiProperty({
    description: "MIME type del archivo",
    example: "application/pdf",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["application/pdf"], { message: "Solo se permite content_type application/pdf" })
  content_type: string;

  @ApiProperty({
    description: "Tamaño del archivo en bytes",
    example: 12345,
    maximum: MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES)
  size_bytes: number;

  @ApiProperty({
    description: "Hash SHA256 del archivo (opcional)",
    required: false,
  })
  @IsString()
  @IsOptional()
  sha256?: string;
}

export class CompleteSocialSecurityUploadDto {
  @ApiProperty({ description: "Nombre original del archivo PDF" })
  @IsString()
  @IsNotEmpty()
  @Matches(/\.pdf$/i, { message: "El archivo debe tener extensión .pdf" })
  original_filename: string;

  @ApiProperty({
    description: "MIME type del archivo",
    example: "application/pdf",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["application/pdf"], { message: "Solo se permite content_type application/pdf" })
  content_type: string;

  @ApiProperty({
    description: "Tamaño del archivo en bytes",
    example: 12345,
    maximum: MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES)
  size_bytes: number;

  @ApiProperty({
    description: "Hash SHA256 del archivo (opcional)",
    required: false,
  })
  @IsString()
  @IsOptional()
  sha256?: string;
}

