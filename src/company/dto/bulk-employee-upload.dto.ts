import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEmployeeDataDto {
  @ApiProperty({ description: 'Email del empleado (debe estar registrado en la plataforma)' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Cargo en la empresa', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: 'Departamento', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Fecha de inicio de empleo (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class BulkEmployeeUploadResponseDto {
  @ApiProperty({ description: 'Total de registros procesados' })
  totalProcessed: number;

  @ApiProperty({ description: 'Registros exitosos' })
  successful: number;

  @ApiProperty({ description: 'Registros con errores' })
  failed: number;

  @ApiProperty({ description: 'Detalles de errores' })
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Empleados creados exitosamente' })
  createdEmployees: Array<{
    id: number;
    name: string;
    email: string;
  }>;
} 