import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsDateString } from "class-validator";

export class AddEmployeeDto {
  @ApiProperty({
    description: "Position/Job title of the employee",
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    description: "Department where the employee will work",
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: "Start date of employment (if different from current date)",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: "Additional notes about the employment",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveEmployeeDto {
  @ApiProperty({ description: "Reason for termination", required: false })
  @IsOptional()
  @IsString()
  terminationReason?: string;

  @ApiProperty({
    description: "End date of employment (if different from current date)",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: "Additional notes about the termination",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
