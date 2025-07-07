import { Controller, Get, Post, Body, Param, Query, UseGuards, Put, Delete } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';

@Controller('attendance')
@UseGuards(AuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('register')
  @Roles('ADMIN', 'BUSINESS')
  async registerAttendance(
    @Body() data: { employeeId: number; checkInTime: string; date: Date, isAbsent },
  ) {
    return this.attendanceService.registerAttendance(
      data.employeeId,
      data.checkInTime,
      data.date,
      data.isAbsent,
    );
  }

  @Get('employee/:id')
  @Roles('ADMIN', 'BUSINESS')
  async getEmployeeAttendance(
    @Param('id') employeeId: number,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.attendanceService.getEmployeeAttendance(
      employeeId,
      startDate,
      endDate,
    );
  }

  @Get('employee/:id/stats')
  @Roles('ADMIN', 'BUSINESS')
  async getEmployeeAttendanceStats(@Param('id') employeeId: number) {
    return this.attendanceService.getEmployeeAttendanceStats(employeeId);
  }

  @Get('report')
  @Roles('ADMIN', 'BUSINESS')
  async generateAttendanceReport(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.attendanceService.generateAttendanceReport(startDate, endDate);
  }

  @Get(':id')
  @Roles('ADMIN', 'BUSINESS')
  async getAttendanceById(@Param('id') id: string) {
    return this.attendanceService.getAttendanceById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'BUSINESS')
  async updateAttendance(
    @Param('id') id: string,
    @Body() data: Partial<{ checkInTime: string; isLate: boolean; isAbsent: boolean; notes: string; date: Date }>,
  ) {
    return this.attendanceService.updateAttendance(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN', 'BUSINESS')
  async deleteAttendance(@Param('id') id: string) {
    await this.attendanceService.deleteAttendance(id);
    return { message: 'Attendance record deleted successfully' };
  }
} 