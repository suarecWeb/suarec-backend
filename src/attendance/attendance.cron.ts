import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AttendanceCron {
  private readonly logger = new Logger(AttendanceCron.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  @Cron('59 23 * * *')
  async markAbsencesForDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar todos los empleados activos (o todos si no hay campo 'active')
    let employees: User[];
    try {
      employees = await this.userRepository.find({ where: {}, relations: ['attendances'] });
    } catch (e) {
      this.logger.error('Error fetching employees', e);
      return;
    }

    for (const employee of employees) {
      // Verificar si ya tiene asistencia para hoy
      const hasAttendance = employee.attendances.some(att => {
        const attDate = new Date(att.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });
      if (!hasAttendance) {
        // Registrar ausencia automática
        const absence = this.attendanceRepository.create({
          employee,
          date: today,
          checkInTime: '00:00',
          isLate: false,
          isAbsent: true,
          notes: 'Ausencia automática',
        });
        await this.attendanceRepository.save(absence);
        this.logger.log(`Ausencia automática registrada para empleado ${employee.id} (${employee.name})`);
      }
    }
  }
} 