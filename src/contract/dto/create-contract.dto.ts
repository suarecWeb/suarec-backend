import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsEnum, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ContractStatus } from '../entities/contract.entity';

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  publicationId: string;

  clientId: number;

  @IsNumberString()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  initialPrice: number;

  @IsString()
  @IsNotEmpty()
  priceUnit: string;

  @IsString()
  @IsOptional()
  clientMessage?: string;
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