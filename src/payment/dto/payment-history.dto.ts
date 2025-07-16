import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaymentStatus } from '../../enums/paymentMethod.enum';

export enum PaymentHistoryType {
  SENT = 'sent',      // Pagos enviados (como payer)
  RECEIVED = 'received', // Pagos recibidos (como payee)
  ALL = 'all'         // Todos los pagos
}

export class PaymentHistoryDto extends PaginationDto {
  @ApiProperty({
    description: 'Tipo de historial de pagos',
    enum: PaymentHistoryType,
    default: PaymentHistoryType.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentHistoryType)
  type?: PaymentHistoryType = PaymentHistoryType.ALL;

  @ApiProperty({
    description: 'Filtrar por estado del pago',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({
    description: 'Fecha de inicio para filtrar (formato YYYY-MM-DD)',
    required: false,
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin para filtrar (formato YYYY-MM-DD)', 
    required: false,
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
