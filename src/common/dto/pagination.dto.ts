import { IsOptional, IsInt, Min, Max, IsString, IsEnum, IsArray, IsNumber } from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { PublicationType } from "../../publication/entities/publication.entity";

export class PaginationDto {
  @ApiProperty({
    description: "Número de página a consultar",
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: "Cantidad de elementos por página",
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: "Tipo de publicación para filtrar",
    enum: PublicationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PublicationType)
  type?: PublicationType;

  @ApiProperty({
    description: "Categoría para filtrar",
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: "Término de búsqueda en título y descripción",
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: "Precio mínimo",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({
    description: "Precio máximo",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({
    description: "Filtrar por múltiples categorías",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim());
    }
    return value;
  })
  categories?: string[];

  @ApiProperty({
    description: "Ordenar por campo",
    required: false,
    enum: ['created_at', 'modified_at', 'price', 'visitors', 'title'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiProperty({
    description: "Dirección del ordenamiento",
    required: false,
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
