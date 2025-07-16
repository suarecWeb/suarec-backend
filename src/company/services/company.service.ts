import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CompanyHistory } from '../entities/company-history.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { UpdateCompanyLocationDto } from '../dto/update-company-location.dto';
import { User } from '../../user/entities/user.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';
import { AddEmployeeDto, RemoveEmployeeDto } from '../dto/employee-management.dto';

@Injectable()
export class CompanyService {
 
  private readonly logger = new Logger('CompanyService');

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CompanyHistory)
    private readonly companyHistoryRepository: Repository<CompanyHistory>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      console.log('Creating company...' + createCompanyDto.email + createCompanyDto.nit + createCompanyDto.userId)

      const existingCompany = await this.companyRepository.findOne({ where: { nit: createCompanyDto.nit } });

      console.log('Existing company ?...' + existingCompany)

      if (existingCompany) {
        throw new BadRequestException('NIT already in use');
      }

      const company = this.companyRepository.create(createCompanyDto);
      const user = await this.userRepository.findOne({ where: {id: createCompanyDto.userId}})

      if (!user) {
        throw new BadRequestException('User not found')
      }

      company.user = user

      await this.companyRepository.save(company);
      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Company>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [companies, total] = await this.companyRepository.findAndCount({
        relations: ['user', 'employees'],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
      const totalPages = Math.ceil(total / limit);

      return {
        data: companies,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id },
        relations: ['user', 'employees'],
      });

      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOneEmail(email: string): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({
        where: { email },
        relations: ['user', 'employees'],
      });

      if (!company) {
        throw new NotFoundException(`Company with email ${email} not found`);
      }

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    try {
      const company = await this.companyRepository.preload({
        id,
        ...updateCompanyDto,
      });

      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }

      await this.companyRepository.save(company);
      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const company = await this.findOne(id);
      await this.companyRepository.remove(company);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async addEmployeeEmail(companyEmail: string, userId: number, addEmployeeDto?: AddEmployeeDto): Promise<Company> {
    try {
      const company = await this.findOneEmail(companyEmail);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Verificar si ya existe un historial activo para este usuario en esta empresa
      const existingActiveHistory = await this.companyHistoryRepository.findOne({
        where: { 
          user: { id: userId }, 
          company: { id: company.id }, 
          isActive: true 
        }
      });

      if (existingActiveHistory) {
        throw new BadRequestException(`User is already an active employee of this company`);
      }

      const startDate = addEmployeeDto?.startDate ? new Date(addEmployeeDto.startDate) : new Date();

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      user.employmentStartDate = startDate;
      await this.userRepository.save(user);

      // Crear registro en el historial
      const companyHistory = this.companyHistoryRepository.create({
        user: user,
        company: company,
        startDate: startDate,
        isActive: true
      });
      await this.companyHistoryRepository.save(companyHistory);

      // Devolver la empresa actualizada con sus empleados
      return this.findOneEmail(companyEmail);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }  

  async addEmployee(companyId: string, userId: number, addEmployeeDto?: AddEmployeeDto): Promise<Company> {
    try {
      const company = await this.findOne(companyId);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      console.error('Adding employee to company...' + companyId + ' for user ' + userId);

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      console.log('User found: ', user);

      // Verificar si ya existe un historial activo para este usuario en esta empresa
      const existingActiveHistory = await this.companyHistoryRepository.findOne({
        where: { 
          user: { id: userId }, 
          company: { id: companyId }, 
          isActive: true 
        }
      });

      console.log('Existing active history: ', existingActiveHistory);

      if (existingActiveHistory) {
        throw new BadRequestException(`User is already an active employee of this company`);
      }

      console.log('Creating new employee history...');

      const startDate = addEmployeeDto?.startDate ? new Date(addEmployeeDto.startDate) : new Date();

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      user.employmentStartDate = startDate;
      await this.userRepository.save(user);

      // Crear registro en el historial
      const companyHistory = this.companyHistoryRepository.create({
        user: user,
        company: company,
        startDate: startDate,
        isActive: true
      });

      console.log('Saving company history: ', companyHistory);

      await this.companyHistoryRepository.save(companyHistory);

      // Devolver la empresa actualizada con sus empleados
      return this.findOne(companyId);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async removeEmployee(companyId: string, userId: number, removeEmployeeDto?: RemoveEmployeeDto): Promise<Company> {
    try {
      const company = await this.findOne(companyId);
      const user = await this.userRepository.findOne({ 
        where: { id: userId },
        relations: ['employer'] 
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.employer || user.employer.id !== company.id) {
        throw new BadRequestException(`User with ID ${userId} is not an employee of company with ID ${companyId}`);
      }

      const endDate = removeEmployeeDto?.endDate ? new Date(removeEmployeeDto.endDate) : new Date();

      // Buscar el historial activo y marcarlo como inactivo
      const activeHistory = await this.companyHistoryRepository.findOne({
        where: { 
          user: { id: userId }, 
          company: { id: companyId }, 
          isActive: true 
        }
      });

      if (activeHistory) {
        activeHistory.endDate = endDate;
        activeHistory.isActive = false;
        await this.companyHistoryRepository.save(activeHistory);
      }

      // Eliminar la relación de empleado
      user.employer = null;
      user.employmentStartDate = null;
      await this.userRepository.save(user);

      // Devolver la empresa actualizada
      return this.findOne(companyId);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getEmployees(companyId: string, paginationDto: PaginationDto): Promise<PaginationResponse<User>> {
    try {
      const company = await this.findOne(companyId);
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      // Buscar todos los usuarios que han tenido historial con esta empresa
      const [historyRecords, total] = await this.companyHistoryRepository.findAndCount({
        where: { company: { id: companyId } },
        relations: ['user', 'user.roles'],
        order: { startDate: 'DESC' },
        skip,
        take: limit,
      });

      // Agrupar por usuario para obtener el historial más reciente de cada uno
      const userHistoryMap = new Map();
      
      // Primero, obtener todos los usuarios únicos que aparecen en el historial
      const allHistoryForCompany = await this.companyHistoryRepository.find({
        where: { company: { id: companyId } },
        relations: ['user', 'user.roles'],
        order: { startDate: 'DESC' },
      });

      // Agrupar por usuario y tomar el historial más reciente
      allHistoryForCompany.forEach(history => {
        const userId = history.user.id;
        if (!userHistoryMap.has(userId)) {
          userHistoryMap.set(userId, history);
        }
      });

      // Convertir a array y aplicar paginación manual
      const uniqueUserHistories = Array.from(userHistoryMap.values());
      const paginatedHistories = uniqueUserHistories.slice(skip, skip + limit);

      // Enriquecer la información de empleados con datos del historial
      const enrichedEmployees = await Promise.all(
        paginatedHistories.map(async (userHistory) => {
          const employee = userHistory.user;
          
          // Buscar el historial activo actual
          const currentActiveHistory = await this.companyHistoryRepository.findOne({
            where: { 
              user: { id: employee.id }, 
              company: { id: companyId }, 
              isActive: true 
            }
          });

          // Si hay historial activo, usarlo; si no, usar el más reciente inactivo
          const relevantHistory = currentActiveHistory || userHistory;
          
          let employmentInfo = null;

          if (relevantHistory) {
            const startDate = new Date(relevantHistory.startDate);
            let endDate = null;
            let diffTime, diffDays, diffMonths, diffYears;

            if (relevantHistory.isActive) {
              // Empleado activo - calcular desde inicio hasta ahora
              const currentDate = new Date();
              diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
              endDate = null;
            } else {
              // Empleado inactivo - calcular duración total de empleo
              endDate = new Date(relevantHistory.endDate);
              diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            }

            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            diffMonths = Math.floor(diffDays / 30);
            diffYears = Math.floor(diffMonths / 12);

            employmentInfo = {
              startDate: relevantHistory.startDate,
              endDate: relevantHistory.endDate,
              position: relevantHistory.position,
              department: relevantHistory.department,
              isActive: relevantHistory.isActive,
              terminationReason: relevantHistory.terminationReason,
              notes: relevantHistory.notes,
              duration: {
                days: diffDays,
                months: diffMonths,
                years: diffYears,
                displayText: this.formatDuration(diffYears, diffMonths, diffDays)
              }
            };
          }

          return {
            ...employee,
            currentEmployment: employmentInfo
          };
        })
      );

      const totalPages = Math.ceil(uniqueUserHistories.length / limit);

      return {
        data: enrichedEmployees as any,
        meta: {
          total: uniqueUserHistories.length,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async updateLocation(id: string, updateLocationDto: UpdateCompanyLocationDto): Promise<Company> {
    const company = await this.findOne(id);
    
    try {
      // Actualizar solo los campos de ubicación
      Object.assign(company, updateLocationDto);
      return await this.companyRepository.save(company);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async getLocation(id: string): Promise<{ latitude: number; longitude: number; address: string; city: string; country: string }> {
    const company = await this.findOne(id);
    
    return {
      latitude: company.latitude,
      longitude: company.longitude,
      address: company.address,
      city: company.city,
      country: company.country
    };
  }

  async findByUserId(userId: number): Promise<Company | null> {
    try {
      const company = await this.companyRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async updateCheckInTime(companyId: string, checkInTime: string): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({ where: { id: companyId } });
      if (!company) {
        throw new NotFoundException('Company not found');
      }

      company.checkInTime = checkInTime;
      await this.companyRepository.save(company);

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getCompanyAttendanceStats(companyId: string, startDate: Date, endDate: Date): Promise<{
    companyCheckInTime: string;
    totalEmployees: number;
    totalAttendanceRecords: number;
    lateArrivals: number;
    onTimeArrivals: number;
    latePercentage: number;
    employeeStats: Array<{
      employeeId: number;
      employeeName: string;
      totalDays: number;
      lateDays: number;
      onTimeDays: number;
      latePercentage: number;
    }>;
  }> {
    try {
      const company = await this.companyRepository.findOne({ 
        where: { id: companyId },
        relations: ['employees']
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Obtener todas las asistencias de los empleados de la empresa en el rango de fechas
      const attendances = await this.attendanceRepository.find({
        where: {
          employee: { employer: { id: companyId } },
          date: Between(startDate, endDate),
          isAbsent: false // Solo contar días trabajados
        },
        relations: ['employee']
      });

      const totalAttendanceRecords = attendances.length;
      const lateArrivals = attendances.filter(a => a.isLate).length;
      const onTimeArrivals = totalAttendanceRecords - lateArrivals;
      const latePercentage = totalAttendanceRecords > 0 ? (lateArrivals / totalAttendanceRecords) * 100 : 0;

      // Estadísticas por empleado
      const employeeStatsMap = new Map();
      
      attendances.forEach(attendance => {
        const employeeId = attendance.employee.id;
        const employeeName = attendance.employee.name;
        
        if (!employeeStatsMap.has(employeeId)) {
          employeeStatsMap.set(employeeId, {
            employeeId,
            employeeName,
            totalDays: 0,
            lateDays: 0,
            onTimeDays: 0,
            latePercentage: 0
          });
        }
        
        const stats = employeeStatsMap.get(employeeId);
        stats.totalDays++;
        
        if (attendance.isLate) {
          stats.lateDays++;
        } else {
          stats.onTimeDays++;
        }
        
        stats.latePercentage = stats.totalDays > 0 ? (stats.lateDays / stats.totalDays) * 100 : 0;
      });

      const employeeStats = Array.from(employeeStatsMap.values());

      return {
        companyCheckInTime: company.checkInTime || '07:00',
        totalEmployees: company.employees.length,
        totalAttendanceRecords,
        lateArrivals,
        onTimeArrivals,
        latePercentage: Math.round(latePercentage * 100) / 100,
        employeeStats
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private handleDBErrors(error: any) {
    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  private formatDuration(years: number, months: number, days: number): string {
    const parts = [];
    
    if (years > 0) {
      parts.push(`${years} año${years > 1 ? 's' : ''}`);
    }
    
    if (months > 0) {
      const remainingMonths = months % 12;
      if (remainingMonths > 0) {
        parts.push(`${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`);
      }
    }
    
    if (parts.length === 0) {
      if (days === 0) {
        return 'Menos de 1 día';
      } else if (days < 30) {
        return `${days} día${days > 1 ? 's' : ''}`;
      } else {
        const monthsFromDays = Math.floor(days / 30);
        const remainingDays = days % 30;
        if (remainingDays > 0) {
          return `${monthsFromDays} mes${monthsFromDays > 1 ? 'es' : ''} y ${remainingDays} día${remainingDays > 1 ? 's' : ''}`;
        } else {
          return `${monthsFromDays} mes${monthsFromDays > 1 ? 'es' : ''}`;
        }
      }
    }
    
    return parts.join(' y ');
  }
}