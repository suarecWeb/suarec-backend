// src/application/dto/update-application.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CreateApplicationDto } from "./create-application.dto";
import { ApplicationStatus } from "../entities/application.entity";

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
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
}
