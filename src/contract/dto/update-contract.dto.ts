import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ContractStatus } from '../entities/contract.entity';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  serviceAddress?: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  @IsOptional()
  @IsString()
  clientMessage?: string;

  @IsOptional()
  @IsString()
  providerMessage?: string;

  @IsOptional()
  @IsNumber()
  initialPrice?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @IsOptional()
  @IsString()
  priceUnit?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  originalPaymentMethod?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsDateString()
  requestedDate?: Date;

  @IsOptional()
  @IsString()
  requestedTime?: string;

  @IsOptional()
  @IsDateString()
  agreedDate?: Date;

  @IsOptional()
  @IsString()
  agreedTime?: string;
}
