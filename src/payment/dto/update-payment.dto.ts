import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../../enums/paymentMethod.enum';

export class UpdatePaymentDto {
  @ApiProperty({
    description: 'Estado del pago',
    enum: PaymentStatus,
    required: false,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({
    description: 'ID de transacción de Wompi',
    required: false,
  })
  @IsString()
  @IsOptional()
  wompi_transaction_id?: string;

  @ApiProperty({
    description: 'Token de aceptación de Wompi',
    required: false,
  })
  @IsString()
  @IsOptional()
  wompi_acceptance_token?: string;

  @ApiProperty({
    description: 'Link de pago de Wompi',
    required: false,
  })
  @IsString()
  @IsOptional()
  wompi_payment_link?: string;

  @ApiProperty({
    description: 'Mensaje de error',
    required: false,
  })
  @IsString()
  @IsOptional()
  error_message?: string;
} 