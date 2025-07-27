import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Attendance } from "./entities/attendance.entity";
import { User } from "../user/entities/user.entity";

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
  ) {}

  private async calculateIsLate(
    employeeId: number,
    checkInTime: string,
  ): Promise<boolean> {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
      relations: ["employer"],
    });

    if (!employee || !employee.employer) {
      // Si no hay empleador, usar la hora por defecto (9:00 AM)
      const [hours, minutes] = checkInTime.split(":").map(Number);
      return hours > 9 || (hours === 9 && minutes > 0);
    }

    // Obtener la hora límite de la empresa
    const companyCheckInTime = employee.employer.checkInTime || "07:00";
    const [companyHours, companyMinutes] = companyCheckInTime
      .split(":")
      .map(Number);
    const [actualHours, actualMinutes] = checkInTime.split(":").map(Number);

    // Convertir a minutos para comparar más fácilmente
    const companyTotalMinutes = companyHours * 60 + companyMinutes;
    const actualTotalMinutes = actualHours * 60 + actualMinutes;

    return actualTotalMinutes > companyTotalMinutes;
  }

  async registerAttendance(
    employeeId: number,
    checkInTime: string,
    date: Date,
    isAbsent: boolean = false,
  ): Promise<Attendance> {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Verifica sino tiene un registro de asistencia para el día actual
    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        employee: { id: employeeId },
        date: date,
      },
    });

    if (existingAttendance) {
      throw new HttpException("Attendance record already exists for this date", HttpStatus.BAD_REQUEST);
    }

    const attendance = new Attendance();
    attendance.employee = employee;
    attendance.date = date;
    attendance.checkInTime = checkInTime;
    attendance.isAbsent = isAbsent;

    // Solo calcular isLate si no es ausencia
    if (!isAbsent) {
      attendance.isLate = await this.calculateIsLate(employeeId, checkInTime);
    } else {
      attendance.isLate = false;
    }

    return this.attendanceRepository.save(attendance);
  }

  async getEmployeeAttendance(
    employeeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: {
        employee: { id: employeeId },
        date: Between(startDate, endDate),
      },
      relations: ["employee"],
      order: { date: "DESC" },
    });
  }

  async getEmployeeAttendanceStats(employeeId: number): Promise<{
    totalDays: number;
    lateDays: number;
    absentDays: number;
    timeInCompany: number;
  }> {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new Error("Employee not found");
    }

    const attendances = await this.attendanceRepository.find({
      where: { employee: { id: employeeId } },
    });

    const stats = {
      totalDays: attendances.filter((a) => !a.isAbsent).length,
      lateDays: attendances.filter((a) => a.isLate && !a.isAbsent).length,
      absentDays: attendances.filter((a) => a.isAbsent).length,
      timeInCompany: employee.employmentStartDate
        ? Math.floor(
            (new Date().getTime() -
              new Date(employee.employmentStartDate).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          )
        : 0,
    };

    return stats;
  }

  async generateAttendanceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      relations: ["employee"],
      order: { date: "DESC" },
    });
  }

  async getAttendanceById(id: string): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ["employee"],
    });
    if (!attendance) {
      throw new Error("Attendance record not found");
    }
    return attendance;
  }

  async updateAttendance(
    id: string,
    data: Partial<Attendance>,
  ): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ["employee"],
    });
    if (!attendance) {
      throw new Error("Attendance record not found");
    }
    Object.assign(attendance, data);

    // Si se actualiza checkInTime, recalcular isLate
    if (data.checkInTime && !attendance.isAbsent) {
      attendance.isLate = await this.calculateIsLate(
        attendance.employee.id,
        data.checkInTime,
      );
    }

    return this.attendanceRepository.save(attendance);
  }

  async deleteAttendance(id: string): Promise<void> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });
    if (!attendance) {
      throw new Error("Attendance record not found");
    }
    await this.attendanceRepository.remove(attendance);
  }
}
