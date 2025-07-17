import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
