import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportContentType } from '../../enums/report-content-type.enum';
import { ReportReason } from '../../enums/report-reason.enum';

export class CreateContentReportDto {
  @IsNumber()
  reported_user_id: number;

  @IsEnum(ReportContentType)
  content_type: ReportContentType;

  @IsString()
  content_id: string; // Changed to string to support UUIDs (publications) and numbers (comments, messages)

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateReportStatusDto {
  @IsEnum(['under_review', 'resolved', 'dismissed'])
  status: 'under_review' | 'resolved' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution_notes?: string;
}
