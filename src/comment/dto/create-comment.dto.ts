import { IsDateString, IsNotEmpty, IsNumber, IsString } from "class-validator";

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

  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
