import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ReportReason } from "../../enums/report-reason.enum";

export class ReportPublicationDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
