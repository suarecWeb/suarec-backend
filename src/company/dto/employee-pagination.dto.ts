import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ALL = 'all'
}

export class EmployeePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Estado del empleado (activo, inactivo o todos)',
    enum: EmployeeStatus,
    default: EmployeeStatus.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus = EmployeeStatus.ALL;
}