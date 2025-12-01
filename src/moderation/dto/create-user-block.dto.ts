import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserBlockDto {
  @IsNumber()
  blocked_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
