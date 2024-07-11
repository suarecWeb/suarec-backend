import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Role } from '../entities/roles.enum';
import { UserStatus } from '../entities/user-status.enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(
    /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/,
    { message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula y un número' }
  )
  password: string;

  @IsString()
  cv_url: string;

  @IsString()
  @IsOptional()
  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  cellphone: string;

  @IsDateString()
  born_at: Date;

  @IsNumber()
  age: number;

  @IsString()
  genre: string;

  @IsOptional()
  status?: UserStatus;
}
