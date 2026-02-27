import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  Min,
  IsInt,
  IsIn,
  Matches,
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
  @Min(20000)
  @Transform(({ value }) => parseFloat(value))
  initialPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(20000)
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
  @IsNotEmpty()
  serviceAddress: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  longitude?: number;

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
  @Min(20000)
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
  @Min(20000)
  counterOffer?: number;

  @IsDateString()
  @IsOptional()
  proposedDate?: Date;

  @IsString()
  @IsOptional()
  proposedTime?: string;
}

export class VerifyOTPDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: "otpCode debe tener 4 dígitos numéricos" })
  otpCode: string;
}

export class GenerateOTPDto {
  @IsOptional()
  @IsInt()
  @IsIn([4], { message: "Solo se permite OTP de 4 dígitos" })
  length?: number;
}
