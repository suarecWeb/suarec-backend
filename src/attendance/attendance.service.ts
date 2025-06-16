import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async registerAttendance(
    employeeId: number,
    checkInTime: string,
    date: Date,
    isAbsent: boolean = false
  ): Promise<Attendance> {
    const employee = await this.userRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new Error('Employee not found');
    }
  
    const attendance = new Attendance();
    attendance.employee = employee;
    attendance.date = date;
    attendance.checkInTime = checkInTime;
    attendance.isAbsent = isAbsent; // <--- ¡AQUÍ!
  
    // Solo calcular isLate si no es ausencia
    if (!isAbsent) {
      const [hours, minutes] = checkInTime.split(':').map(Number);
      attendance.isLate = hours > 9 || (hours === 9 && minutes > 0);
    } else {
      attendance.isLate = false;
    }
  
    return this.attendanceRepository.save(attendance);
  }

  async getEmployeeAttendance(employeeId: number, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: {
        employee: { id: employeeId },
        date: Between(startDate, endDate),
      },
      relations: ['employee'],
      order: { date: 'DESC' },
    });
  }

  async getEmployeeAttendanceStats(employeeId: number): Promise<{
    totalDays: number;
    lateDays: number;
    absentDays: number;
    timeInCompany: number;
  }> {
    const employee = await this.userRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new Error('Employee not found');
    }

    const attendances = await this.attendanceRepository.find({
      where: { employee: { id: employeeId } },
    });

    const stats = {
      totalDays: attendances.filter(a => !a.isAbsent).length,
      lateDays: attendances.filter(a => a.isLate && !a.isAbsent).length,
      absentDays: attendances.filter(a => a.isAbsent).length,
      timeInCompany: employee.employmentStartDate 
        ? Math.floor((new Date().getTime() - new Date(employee.employmentStartDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0,
    };

    return stats;
  }

  async generateAttendanceReport(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      relations: ['employee'],
      order: { date: 'DESC' },
    });
  }

  async getAttendanceById(id: string): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({ where: { id }, relations: ['employee'] });
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    return attendance;
  }

  async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({ where: { id } });
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    Object.assign(attendance, data);
    // Si se actualiza checkInTime, recalcular isLate
    if (data.checkInTime) {
      const [hours, minutes] = data.checkInTime.split(':').map(Number);
      attendance.isLate = hours > 9 || (hours === 9 && minutes > 0);
    }
    return this.attendanceRepository.save(attendance);
  }

  async deleteAttendance(id: string): Promise<void> {
    const attendance = await this.attendanceRepository.findOne({ where: { id } });
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    await this.attendanceRepository.remove(attendance);
  }
} 