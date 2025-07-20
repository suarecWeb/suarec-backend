import { IsString, IsEnum, IsOptional, IsEmail, IsPhoneNumber, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountType, DocumentType } from "../entities/bank-info.entity";

export class CreateBankInfoDto {
  @ApiProperty({
    description: "Nombre completo del titular de la cuenta",
    example: "Juan Carlos Pérez Rodríguez",
    maxLength: 255,
  })
  @IsString({ message: "El nombre del titular debe ser una cadena de texto" })
  @MaxLength(255, { message: "El nombre del titular no puede tener más de 255 caracteres" })
  accountHolderName: string;

  @ApiProperty({
    description: "Tipo de documento de identificación",
    enum: DocumentType,
    example: DocumentType.CC,
  })
  @IsEnum(DocumentType, { message: "Tipo de documento inválido" })
  documentType: DocumentType;

  @ApiProperty({
    description: "Número del documento de identificación",
    example: "12345678",
    maxLength: 50,
  })
  @IsString({ message: "El número de documento debe ser una cadena de texto" })
  @MaxLength(50, { message: "El número de documento no puede tener más de 50 caracteres" })
  documentNumber: string;

  @ApiProperty({
    description: "Nombre del banco",
    example: "Bancolombia",
    maxLength: 100,
  })
  @IsString({ message: "El nombre del banco debe ser una cadena de texto" })
  @MaxLength(100, { message: "El nombre del banco no puede tener más de 100 caracteres" })
  bankName: string;

  @ApiProperty({
    description: "Tipo de cuenta bancaria",
    enum: AccountType,
    example: AccountType.AHORROS,
  })
  @IsEnum(AccountType, { message: "Tipo de cuenta inválido" })
  accountType: AccountType;

  @ApiProperty({
    description: "Número de cuenta bancaria",
    example: "123456789012",
    maxLength: 50,
  })
  @IsString({ message: "El número de cuenta debe ser una cadena de texto" })
  @MaxLength(50, { message: "El número de cuenta no puede tener más de 50 caracteres" })
  accountNumber: string;

  @ApiProperty({
    description: "Correo electrónico para confirmaciones",
    example: "juan.perez@email.com",
    maxLength: 255,
  })
  @IsEmail({}, { message: "El correo electrónico debe tener un formato válido" })
  @MaxLength(255, { message: "El correo electrónico no puede tener más de 255 caracteres" })
  contactEmail: string;

  @ApiProperty({
    description: "Teléfono para confirmaciones",
    example: "+573001234567",
    maxLength: 20,
  })
  @IsString({ message: "El teléfono de contacto debe ser una cadena de texto" })
  @MaxLength(20, { message: "El teléfono de contacto no puede tener más de 20 caracteres" })
  contactPhone: string;
}

export class UpdateBankInfoDto extends CreateBankInfoDto {}

export class BankInfoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accountHolderName: string;

  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty()
  documentNumber: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty({ enum: AccountType })
  accountType: AccountType;

  @ApiProperty()
  accountNumber: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
