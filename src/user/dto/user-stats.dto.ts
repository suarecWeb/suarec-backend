import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";

export enum StatsTimeRange {
  LAST_WEEK = "LAST_WEEK", // eslint-disable-line no-unused-vars
  LAST_MONTH = "LAST_MONTH", // eslint-disable-line no-unused-vars
  LAST_3_MONTHS = "LAST_3_MONTHS", // eslint-disable-line no-unused-vars
  LAST_6_MONTHS = "LAST_6_MONTHS", // eslint-disable-line no-unused-vars
  LAST_YEAR = "LAST_YEAR", // eslint-disable-line no-unused-vars
  ALL_TIME = "ALL_TIME", // eslint-disable-line no-unused-vars
}

export class UserStatsDto {
  @ApiProperty({
    enum: StatsTimeRange,
    required: false,
    default: StatsTimeRange.LAST_MONTH,
    description: "Time range for statistics calculation",
  })
  @IsOptional()
  @IsEnum(StatsTimeRange)
  timeRange?: StatsTimeRange = StatsTimeRange.LAST_MONTH;
}
