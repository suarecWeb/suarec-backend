import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Property } from '../property/entities/property.entity';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  controllers: [ReportController],
  providers: [ReportService],
  imports: [TypeOrmModule.forFeature([User]), TypeOrmModule.forFeature([Property]),
  TypeOrmModule.forFeature([Booking])],
  exports: [ReportService, TypeOrmModule]
})
export class ReportModule {}