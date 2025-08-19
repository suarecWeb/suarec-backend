// src/message/dto/create-ticket.dto.ts
import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTicketDto {
  @ApiProperty({
    description: "El contenido del mensaje inicial del ticket",
    example: "Necesito ayuda con mi cuenta",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: "ID del usuario que crea el ticket",
    example: 1,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
} 