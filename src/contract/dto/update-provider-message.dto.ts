import { IsString } from 'class-validator';

export class UpdateProviderMessageDto {
  @IsString()
  providerMessage: string;
}
