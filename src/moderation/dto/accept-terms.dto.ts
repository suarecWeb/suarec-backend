import { IsOptional, IsString } from 'class-validator';

export class AcceptTermsDto {
  @IsOptional()
  @IsString()
  terms_version?: string = '1.0';

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}
