import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";
import { ContractStatus } from "../entities/contract.entity";

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  publicationId: string;

  @IsNumber()
  @IsNotEmpty()
  clientId: number;

  @IsNumber()
  @IsOptional() // Opcional ya que se obtiene automáticamente de la publicación
  providerId?: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  initialPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  totalPrice: number;

  @IsString()
  @IsNotEmpty()
  priceUnit: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  quantity?: number;

  @IsString()
  @IsOptional()
  clientMessage?: string;

  @IsDateString()
  @IsOptional()
  requestedDate?: Date;

  @IsString()
  @IsOptional()
  requestedTime?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  originalPaymentMethod?: string;

  @IsString()
  @IsOptional()
  serviceAddress?: string;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  locationDescription?: string;
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
  action:
    | ContractStatus.ACCEPTED
    | ContractStatus.REJECTED
    | ContractStatus.NEGOTIATING;

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
