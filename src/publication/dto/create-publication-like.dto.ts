import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreatePublicationLikeDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  publicationId: string;
}
