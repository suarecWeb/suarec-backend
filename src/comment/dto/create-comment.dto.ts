import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  created_at: Date;

  @IsString()
  @IsNotEmpty()
  publicationId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
