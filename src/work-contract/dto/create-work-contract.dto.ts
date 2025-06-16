// src/work-contract/dto/create-work-contract.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsDateString, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractType } from '../entities/work-contract.entity';

export class CreateWorkContractDto {
  @ApiProperty({
    description: 'Título del contrato',
    example: 'Reparación de plomería en cocina',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del trabajo',
    example: 'Reparar fuga en tubería de cocina y cambiar grifo',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Precio acordado',
    example: 150000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  agreed_price?: number;

  @ApiProperty({
    description: 'Moneda del precio',
    example: 'COP',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Tipo de contrato',
    enum: ContractType,
    example: ContractType.SERVICE,
  })
  @IsEnum(ContractType)
  @IsNotEmpty()
  type: ContractType;

  @ApiProperty({
    description: 'Fecha de inicio del trabajo',
    example: '2025-01-20',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  start_date?: Date;

  @ApiProperty({
    description: 'Fecha estimada de finalización',
    example: '2025-01-22',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  estimated_completion?: Date;

  @ApiProperty({
    description: 'Ubicación donde se realizará el trabajo',
    example: 'Calle 123 #45-67, Bogotá',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'URLs de imágenes relacionadas',
    example: ['https://example.com/image1.jpg'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({
    description: 'Notas del cliente',
    example: 'Trabajo urgente, disponible en horario de mañana',
    required: false,
  })
  @IsString()
  @IsOptional()
  client_notes?: string;

  @ApiProperty({
    description: 'ID del cliente que contrata',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  clientId: number;

  @ApiProperty({
    description: 'ID del proveedor del servicio',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  providerId: number;

  @ApiProperty({
    description: 'ID de la publicación relacionada',
    example: 'uuid-publication-id',
    required: false,
  })
  @IsString()
  @IsOptional()
  publicationId?: string;
}