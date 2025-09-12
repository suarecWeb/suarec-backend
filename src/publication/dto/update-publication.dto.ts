import { IsOptional, IsString, IsNumber, IsUrl, MaxLength, IsArray, IsDateString, IsEnum } from "class-validator";
import { PublicationType } from "../entities/publication.entity";

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

  @IsEnum(PublicationType)
  @IsOptional()
  type?: PublicationType;

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

  // Nuevos campos de ubicación detallada
  @IsString()
  @IsOptional()
  @MaxLength(50)
  locationType?: string; // Tipo de ubicación: 'presencial' | 'virtual'

  @IsString()
  @IsOptional()
  @MaxLength(50)
  serviceLocation?: string; // Modalidad del servicio: 'domicilio' | 'sitio'

  @IsString()
  @IsOptional()
  @MaxLength(200)
  virtualMeetingLink?: string; // Link de videollamada

  @IsString()
  @IsOptional()
  @MaxLength(100)
  propertyType?: string; // Tipo de inmueble

  @IsString()
  @IsOptional()
  @MaxLength(500)
  references?: string; // Referencias de ubicación
}
