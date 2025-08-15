import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

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
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: "Categoría para filtrar",
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;
}
