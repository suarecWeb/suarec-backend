import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ContractStatus } from '../entities/contract.entity';

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  publicationId: string;

  clientId: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  initialPrice: number;

  @IsString()
  @IsNotEmpty()
  priceUnit: string;

  @IsString()
  @IsOptional()
  clientMessage?: string;

  @IsDateString()
  @IsOptional()
  requestedDate?: Date;

  @IsString()
  @IsOptional()
  requestedTime?: string;
}

export class CreateBidDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsNumber()
  @IsNotEmpty()
  bidderId: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  message?: string;
}

export class AcceptBidDto {
  @IsUUID()
  @IsNotEmpty()
  bidId: string;

  @IsNumber()
  @IsNotEmpty()
  acceptorId: number;
}

export class ProviderResponseDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsEnum(ContractStatus)
  @IsNotEmpty()
  action: 'accept' | 'reject' | 'negotiate';

  @IsString()
  @IsOptional()
  providerMessage?: string;

  @IsNumber()
  @IsOptional()
  counterOffer?: number;

  @IsDateString()
  @IsOptional()
  proposedDate?: Date;

  @IsString()
  @IsOptional()
  proposedTime?: string;
} 