import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PublicationType } from '../entities/publication.entity';

export class FilterPublicationsDto {
  @ApiProperty({
    description: 'Número de página a consultar',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de elementos por página',
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Término de búsqueda (título, descripción, categoría)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Categoría específica para filtrar',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Tipo de publicación',
    enum: PublicationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PublicationType)
  type?: PublicationType;

  @ApiProperty({
    description: 'Ordenar por fecha (ASC o DESC)',
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderBy?: 'ASC' | 'DESC' = 'DESC';
}

