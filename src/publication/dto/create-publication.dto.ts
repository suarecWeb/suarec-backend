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
  Min,
} from "class-validator";

export enum PublicationType {
  // Tipos de servicios
  SERVICE = "SERVICE", // Usuario ofrece servicios (OFERTA)
  SERVICE_REQUEST = "SERVICE_REQUEST", // Usuario busca servicios (SOLICITUD)
  
  // Tipos de empleos
  JOB = "JOB", // Empresa ofrece vacante
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

  @IsEnum(PublicationType)
  @IsNotEmpty()
  type: PublicationType;

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsNumber()
  @IsOptional()
  visitors?: number;

  @IsNumber()
  @IsOptional()
  @Min(20000)
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

  // Campos específicos para solicitudes de servicios
  @IsString()
  @IsOptional()
  @MaxLength(500)
  requirements?: string; // Requisitos del trabajo

  @IsString()
  @IsNotEmpty()
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

  // Nuevos campos de ubicación detallada (opcionales para compatibilidad)
  @IsString()
  @IsOptional()
  @MaxLength(50)
  locationType?: 'presencial' | 'virtual'; // Tipo de ubicación

  @IsString()
  @IsOptional()
  @MaxLength(50)
  serviceLocation?: 'domicilio' | 'sitio'; // Modalidad del servicio

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
  @MaxLength(300)
  references?: string; // Referencias de ubicación
}
