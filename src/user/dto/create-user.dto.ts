import { IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
//import { ApiProperty } from '@nestjs/swagger'; // Si usas Swagger para documentación

export class CreateUserDto {
  //@ApiProperty({ example: 'John Doe', description: 'The name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  //@ApiProperty({ example: 'password123', description: 'The password of the user' })
  @IsString()
  @IsNotEmpty()
  password: string;

  //@ApiProperty({ example: 'http://example.com/cv.pdf', description: 'The URL of the user\'s CV', required: false })
  @IsString()
  @IsOptional()
  cv_url?: string;

  //@ApiProperty({ example: 'Male', description: 'The gender of the user' })
  @IsString()
  @IsNotEmpty()
  genre: string;

  //@ApiProperty({ example: '1234567890', description: 'The cellphone number of the user' })
  @IsString()
  @IsNotEmpty()
  cellphone: string;

  //@ApiProperty({ example: 'john.doe@example.com', description: 'The email of the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  //@ApiProperty({ example: '1990-01-01', description: 'The birth date of the user' })
  @IsDate()
  @Type(() => Date) // Para transformar el string a Date
  @IsNotEmpty()
  born_at: Date;

  //@ApiProperty({ example: ['admin', 'user'], description: 'The roles assigned to the user', required: false })
  @IsArray()
  @IsString({ each: true }) // Cada elemento del array debe ser un string
  @IsOptional()
  roles?: string[]; // Lista de nombres de roles (strings)

  // Si necesitas incluir la compañía, puedes agregar un campo opcional para el ID de la compañía
  //@ApiProperty({ example: '1', description: 'The ID of the company associated with the user', required: false })
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  profession?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}