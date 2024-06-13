import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReportService } from './report.service';


@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  
  /* istanbul ignore next */
  @Get('occupancy')
  generateReport() {
    return this.reportService.generateOccupancyReport();
  }

  /* istanbul ignore next */
  @Get('financial')
  generateFinancialReport() {
    return this.reportService.generateFinancialReport();
  }
  /* istanbul ignore next */
  @Get('revenue-by-city')
  generateRevenueByCity() {
    return this.reportService.generateRevenueByCityReport();
  }
  /* istanbul ignore next */
  @Get('user-activity')
  generateUserActivityReport() {
    return this.reportService.generateUserActivityReport();
  }

  
}