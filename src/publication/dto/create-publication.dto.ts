import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsArray,
  IsEnum,
} from "class-validator";

export enum PublicationType {
  SERVICE = "SERVICE", // Valor existente para compatibilidad
  SERVICE_OFFER = "SERVICE_OFFER", // Oferta de servicio (trabajador ofrece servicio)
  SERVICE_REQUEST = "SERVICE_REQUEST", // Solicitud de servicio (cliente busca trabajador)
}

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

  @IsEnum(PublicationType)
  @IsNotEmpty()
  type: PublicationType;

  // Campos específicos para solicitudes de servicios
  @IsString()
  @IsOptional()
  @MaxLength(500)
  requirements?: string; // Requisitos del trabajo

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string; // Ubicación del trabajo

  @IsString()
  @IsOptional()
  @MaxLength(100)
  urgency?: string; // Urgencia: "LOW", "MEDIUM", "HIGH"

  @IsString()
  @IsOptional()
  @MaxLength(200)
  preferredSchedule?: string; // Horario preferido
}
