import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { User } from '../user/entities/user.entity';
import { AttendanceCron } from './attendance.cron';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, User])],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCron],
  exports: [AttendanceService],
})
export class AttendanceModule {} 