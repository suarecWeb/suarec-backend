// src/message/dto/update-message.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CreateMessageDto } from "./create-message.dto";

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @ApiProperty({
    description: "Indica si el mensaje ha sido leído",
    example: true,
  })
  read?: boolean;

  @ApiProperty({
    description: "Fecha y hora en que se leyó el mensaje",
    example: "2025-05-20T15:30:00Z",
  })
  read_at?: Date;
}
