import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, WompiPaymentType } from '../../enums/paymentMethod.enum';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Monto del pago',
    example: 150000,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Moneda del pago',
    example: 'COP',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.Wompi,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method: PaymentMethod;

  @ApiProperty({
    description: 'Tipo de pago Wompi (solo si payment_method es WOMPI)',
    enum: WompiPaymentType,
    required: false,
  })
  @IsEnum(WompiPaymentType)
  @IsOptional()
  wompi_payment_type?: WompiPaymentType;

  @ApiProperty({
    description: 'ID del contrato de trabajo',
    example: 'uuid-del-contrato',
  })
  @IsUUID()
  @IsNotEmpty()
  work_contract_id: string;

  @ApiProperty({
    description: 'ID del usuario que recibe el pago',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  payee_id: number;

  @ApiProperty({
    description: 'Descripción del pago',
    example: 'Pago por servicios de plomería',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Referencia personalizada',
    example: 'REF-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  reference?: string;
} 