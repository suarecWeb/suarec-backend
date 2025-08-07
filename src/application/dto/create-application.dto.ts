// src/application/dto/create-application.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateApplicationDto {
  @ApiProperty({
    description: "ID del usuario que aplica",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: "ID de la publicación a la que aplica",
    example: "uuid-publication-id",
  })
  @IsString()
  @IsNotEmpty()
  publicationId: string;

  @ApiProperty({
    description: "Mensaje opcional del aplicante",
    example: "Estoy muy interesado en esta oportunidad...",
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: "Precio propuesto por el servicio",
    example: 50000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: "Unidad del precio (hour, day, service, etc.)",
    example: "service",
    required: false,
  })
  @IsString()
  @IsOptional()
  priceUnit?: string;
}
