// src/message/dto/create-message.dto.ts
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateMessageDto {
  @ApiProperty({
    description: "El contenido del mensaje",
    example: "Hola, ¿cómo estás?",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: "ID del usuario remitente",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  senderId: number;

  @ApiProperty({
    description: "ID del usuario destinatario",
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  recipientId: number;

  @ApiProperty({
    description: "ID del ticket al que pertenece el mensaje (opcional)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  @IsString()
  ticket_id?: string;
}
