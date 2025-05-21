import { IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  cv_url?: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsString()
  @IsNotEmpty()
  cellphone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  born_at: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  // Relación con la empresa como administrador (oneToOne)
  @IsString()
  @IsOptional()
  companyId?: string;

  // Relación con la empresa como empleado (manyToOne)
  @IsString()
  @IsOptional()
  @IsUUID('all', { message: 'Employer ID must be a valid UUID' })
  employerId?: string;
}