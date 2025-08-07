// src/application/dto/update-application.dto.ts
import { IsEnum, IsOptional, IsString, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ApplicationStatus } from "../entities/application.entity";

export class UpdateApplicationDto {
  @ApiProperty({
    description: "Nuevo estado de la aplicación",
    enum: ApplicationStatus,
    example: ApplicationStatus.ACCEPTED,
  })
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @ApiProperty({
    description: "Mensaje de respuesta (opcional)",
    example: "Felicidades, has sido aceptado...",
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
