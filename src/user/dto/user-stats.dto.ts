
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

export enum StatsTimeRange {
  LAST_WEEK = 'LAST_WEEK',
  LAST_MONTH = 'LAST_MONTH',
  LAST_3_MONTHS = 'LAST_3_MONTHS',
  LAST_6_MONTHS = 'LAST_6_MONTHS',
  LAST_YEAR = 'LAST_YEAR',
  ALL_TIME = 'ALL_TIME'
}

export class UserStatsDto {
  @ApiProperty({ 
    enum: StatsTimeRange, 
    required: false, 
    default: StatsTimeRange.LAST_MONTH,
    description: 'Time range for statistics calculation'
  })
  @IsOptional()
  @IsEnum(StatsTimeRange)
  timeRange?: StatsTimeRange = StatsTimeRange.LAST_MONTH;
}
