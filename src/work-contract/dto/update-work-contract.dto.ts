// src/work-contract/dto/update-work-contract.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CreateWorkContractDto } from "./create-work-contract.dto";
import { ContractStatus } from "../entities/work-contract.entity";

export class UpdateWorkContractDto extends PartialType(CreateWorkContractDto) {
  @ApiProperty({
    description: "Estado del contrato",
    enum: ContractStatus,
    example: ContractStatus.IN_PROGRESS,
    required: false,
  })
  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @ApiProperty({
    description: "Fecha real de finalización",
    example: "2025-01-22",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  end_date?: Date;

  @ApiProperty({
    description: "Notas del proveedor",
    example: "Trabajo completado satisfactoriamente",
    required: false,
  })
  @IsOptional()
  provider_notes?: string;

  // No permitir cambiar las partes del contrato una vez creado
  clientId?: never;
  providerId?: never;
}
