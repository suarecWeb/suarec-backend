import { IsDate, IsEmail, IsNotEmpty, IsNumber, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  nit: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  born_at: Date;

  @IsNotEmpty()
  created_at: Date;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{1,3}\s?\d{1,14}$/, { message: 'Cellphone number is not valid' })
  cellphone: string;

  @IsNumber()
  @IsNotEmpty()
  userId: number; 
}
