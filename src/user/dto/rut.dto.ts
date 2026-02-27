import { IsString, IsOptional, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRutDto {
  @ApiProperty({ description: "URL del archivo RUT" })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ description: "Ruta del archivo en Supabase Storage" })
  @IsString()
  @IsNotEmpty()
  file_path: string;
}

export class ReviewRutDto {
  @ApiProperty({
    description: "Estado de revisión",
    enum: ["approved", "rejected"],
  })
  @IsEnum(["approved", "rejected"])
  @IsNotEmpty()
  status: "approved" | "rejected";

  @ApiProperty({ description: "Comentarios de la revisión", required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
