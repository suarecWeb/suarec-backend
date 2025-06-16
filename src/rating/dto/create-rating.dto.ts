// src/rating/dto/create-rating.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RatingCategory {
  SERVICE = 'SERVICE',
  EMPLOYER = 'EMPLOYER',
  EMPLOYEE = 'EMPLOYEE'
}

export class CreateRatingDto {
  @ApiProperty({
    description: 'ID del usuario que da la calificación',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  reviewerId: number;

  @ApiProperty({
    description: 'ID del usuario que recibe la calificación',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  revieweeId: number;

  @ApiProperty({
    description: 'Número de estrellas (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  stars: number;

  @ApiProperty({
    description: 'Comentario sobre la calificación',
    example: 'Excelente trabajo, muy profesional',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'Categoría de la calificación',
    enum: RatingCategory,
    example: RatingCategory.SERVICE,
  })
  @IsEnum(RatingCategory)
  @IsNotEmpty()
  category: RatingCategory;

  @ApiProperty({
    description: 'ID del contrato de trabajo relacionado',
    example: 'uuid-contract-id',
    required: false,
  })
  @IsString()
  @IsOptional()
  workContractId?: string;
}