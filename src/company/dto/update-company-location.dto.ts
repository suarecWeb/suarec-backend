import {
  IsNumber,
  IsString,
  IsOptional,
  IsLatitude,
  IsLongitude,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCompanyLocationDto {
  @ApiProperty({
    description: "Latitude of the company location",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({
    description: "Longitude of the company location",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({
    description: "Physical address of the company",
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: "City where the company is located",
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: "Country where the company is located",
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;
}
