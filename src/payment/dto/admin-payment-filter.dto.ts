import { IsOptional, IsEnum, IsDateString, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaymentStatus, PaymentMethod } from "../../enums/paymentMethod.enum";

export class AdminPaymentFilterDto extends PaginationDto {
  @ApiProperty({
    description: "Filtrar por estado del pago",
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({
    description: "Filtrar por método de pago",
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: "Filtrar por ID del usuario que paga",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  payerId?: number;

  @ApiProperty({
    description: "Filtrar por ID del usuario que recibe",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  payeeId?: number;

  @ApiProperty({
    description: "Fecha de inicio para filtrar (formato YYYY-MM-DD)",
    required: false,
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: "Fecha de fin para filtrar (formato YYYY-MM-DD)",
    required: false,
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: "Filtrar por ID del contrato",
    required: false,
  })
  @IsOptional()
  contractId?: string;

  @ApiProperty({
    description: "Monto mínimo para filtrar",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAmount?: number;

  @ApiProperty({
    description: "Monto máximo para filtrar",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;
}
