import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Tecnología'
  })
  name: string;

  @ApiProperty({
    description: 'Cantidad de publicaciones en esta categoría',
    example: 25
  })
  count: number;
}

export class CategoriesResponseDto {
  @ApiProperty({
    description: 'Lista de categorías disponibles con conteo',
    type: [CategoryDto]
  })
  categories: CategoryDto[];

  @ApiProperty({
    description: 'Total de categorías',
    example: 10
  })
  total: number;
}

