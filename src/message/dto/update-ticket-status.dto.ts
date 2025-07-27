import { IsNotEmpty, IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: "El nuevo estado del ticket",
    example: "resolved",
    enum: ["open", "closed", "resolved"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["open", "closed", "resolved"])
  status: string;
} 