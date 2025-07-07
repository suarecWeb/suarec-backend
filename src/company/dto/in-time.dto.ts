import { IsString, IsOptional, Matches, IsDateString } from 'class-validator';

export class UpdateCheckInTimeDto {
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'checkInTime must be in HH:MM format (24-hour)' 
  })
  checkInTime: string;
}

export class AttendanceStatsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
