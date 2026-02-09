import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PushPlatform } from "../entities/push-token.entity";

export class RegisterPushTokenDto {
  @ApiProperty({
    description: "Expo push token",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: "Plataforma del dispositivo",
    enum: PushPlatform,
    example: PushPlatform.ANDROID,
  })
  @IsEnum(PushPlatform)
  platform: PushPlatform;

  @ApiProperty({
    description: "ID del usuario",
    example: 123,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: "Identificador del dispositivo (opcional)",
    required: false,
    example: "device-uuid-123",
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: "Version de la app (opcional)",
    required: false,
    example: "1.0.5",
  })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
