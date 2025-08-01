import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Company } from "../entities/company.entity";
import { CompanyHistory } from "../entities/company-history.entity";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";
import { UpdateCompanyLocationDto } from "../dto/update-company-location.dto";
import { User } from "../../user/entities/user.entity";
import { Attendance } from "../../attendance/entities/attendance.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import {
  AddEmployeeDto,
  RemoveEmployeeDto,
} from "../dto/employee-management.dto";
import { EmployeePaginationDto, EmployeeStatus } from "../dto/employee-pagination.dto";

@Injectable()
export class CompanyService {
  private readonly logger = new Logger("CompanyService");

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(CompanyHistory)
    private readonly companyHistoryRepository: Repository<CompanyHistory>, // eslint-disable-line no-unused-vars
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>, // eslint-disable-line no-unused-vars
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      const existingCompany = await this.companyRepository.findOne({
        where: { nit: createCompanyDto.nit },
      });

      if (existingCompany) {
        throw new BadRequestException("NIT already in use");
      }

      const company = this.companyRepository.create(createCompanyDto);
      const user = await this.userRepository.findOne({
        where: { id: createCompanyDto.userId },
      });

      if (!user) {
        throw new BadRequestException("User not found");
      }

      company.user = user;

      await this.companyRepository.save(company);
      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Company>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [companies, total] = await this.companyRepository.findAndCount({
        relations: ["user", "employees"],
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
        relations: ["user", "employees"],
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
        relations: ["user", "employees"],
      });

      if (!company) {
        throw new NotFoundException(`Company with email ${email} not found`);
      }

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
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

  async addEmployeeEmail(
    companyEmail: string,
    userId: number,
    addEmployeeDto?: AddEmployeeDto,
  ): Promise<Company> {
    try {
      const company = await this.findOneEmail(companyEmail);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Verificar si ya existe un historial activo para este usuario en esta empresa
      const existingActiveHistory = await this.companyHistoryRepository.findOne(
        {
          where: {
            user: { id: userId },
            company: { id: company.id },
            isActive: true,
          },
        },
      );

      if (existingActiveHistory) {
        throw new BadRequestException(
          `User is already an active employee of this company`,
        );
      }

      const startDate = addEmployeeDto?.startDate
        ? new Date(addEmployeeDto.startDate)
        : new Date();

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      user.employmentStartDate = startDate;
      await this.userRepository.save(user);

      // Crear registro en el historial
      const companyHistory = this.companyHistoryRepository.create({
        user: user,
        company: company,
        startDate: startDate,
        isActive: true,
      });
      await this.companyHistoryRepository.save(companyHistory);

      // Devolver la empresa actualizada con sus empleados
      return this.findOneEmail(companyEmail);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async addEmployee(
    companyId: string,
    userId: number,
    addEmployeeDto?: AddEmployeeDto,
  ): Promise<Company> {
    try {
      const company = await this.findOne(companyId);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Verificar si ya existe un historial activo para este usuario en esta empresa
      const existingActiveHistory = await this.companyHistoryRepository.findOne(
        {
          where: {
            user: { id: userId },
            company: { id: companyId },
            isActive: true,
          },
        },
      );

      if (existingActiveHistory) {
        throw new BadRequestException(
          `User is already an active employee of this company`,
        );
      }

      const startDate = addEmployeeDto?.startDate
        ? new Date(addEmployeeDto.startDate)
        : new Date();

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      user.employmentStartDate = startDate;
      await this.userRepository.save(user);

      // Crear registro en el historial
      const companyHistory = this.companyHistoryRepository.create({
        user: user,
        company: company,
        startDate: startDate,
        isActive: true,
      });

      await this.companyHistoryRepository.save(companyHistory);

      // Devolver la empresa actualizada con sus empleados
      return this.findOne(companyId);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async removeEmployee(
    companyId: string,
    userId: number,
    removeEmployeeDto?: RemoveEmployeeDto,
  ): Promise<Company> {
    try {
      const company = await this.findOne(companyId);
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["employer"],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.employer || user.employer.id !== company.id) {
        throw new BadRequestException(
          `User with ID ${userId} is not an employee of company with ID ${companyId}`,
        );
      }

      const endDate = removeEmployeeDto?.endDate
        ? new Date(removeEmployeeDto.endDate)
        : new Date();

      // Buscar el historial activo y marcarlo como inactivo
      const activeHistory = await this.companyHistoryRepository.findOne({
        where: {
          user: { id: userId },
          company: { id: companyId },
          isActive: true,
        },
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

  async getEmployees(
    companyId: string, 
    paginationDto: EmployeePaginationDto
  ): Promise<PaginationResponse<User>> {
    try {
      const company = await this.findOne(companyId);
      const { page, limit, status } = paginationDto;
      const skip = (page - 1) * limit;

      // Construir query base con TypeORM QueryBuilder para mejor performance
      const queryBuilder = this.companyHistoryRepository
        .createQueryBuilder('history')
        .leftJoinAndSelect('history.user', 'user')
        .leftJoinAndSelect('user.roles', 'roles')
        .where('history.companyId = :companyId', { companyId });

      // Aplicar filtros de estado
      if (status === EmployeeStatus.ACTIVE) {
        queryBuilder.andWhere('history.isActive = :isActive', { isActive: true });
      } else if (status === EmployeeStatus.INACTIVE) {
        queryBuilder.andWhere('history.isActive = :isActive', { isActive: false });
      }

      // Subconsulta para obtener el historial más reciente por usuario
      const latestHistorySubQuery = this.companyHistoryRepository
        .createQueryBuilder('sub_history')
        .select('sub_history.userId', 'userId')
        .addSelect('MAX(sub_history.startDate)', 'maxStartDate')
        .where('sub_history.companyId = :companyId', { companyId })
        .groupBy('sub_history.userId')
        .getQuery();

      // Query principal que usa la subconsulta
      queryBuilder
        .andWhere(`(user.id, history.startDate) IN (${latestHistorySubQuery})`)
        .orderBy('history.startDate', 'DESC');

      // Obtener el total de registros únicos para paginación
      const totalQuery = this.companyHistoryRepository
        .createQueryBuilder('history')
        .leftJoin('history.user', 'user')
        .select('COUNT(DISTINCT history.userId)', 'count')
        .where('history.companyId = :companyId', { companyId });

      // Aplicar los mismos filtros al conteo
      if (status === EmployeeStatus.ACTIVE) {
        totalQuery.andWhere('history.isActive = :isActive', { isActive: true });
      } else if (status === EmployeeStatus.INACTIVE) {
        totalQuery.andWhere('history.isActive = :isActive', { isActive: false });
      }

      // Ejecutar ambas queries en paralelo
      const [historyRecords, totalResult] = await Promise.all([
        queryBuilder.skip(skip).take(limit).getMany(),
        totalQuery.getRawOne()
      ]);

      const total = parseInt(totalResult.count);

      // Enriquecer la información de empleados con datos del historial

      const enrichedEmployees = await Promise.all(
        historyRecords.map(async (userHistory) => {
          const employee = userHistory.user;

          // Para empleados activos, verificar si hay historial activo actual
          let relevantHistory = userHistory;

          if (status === EmployeeStatus.ALL || !status) {
            // Si no hay filtro específico, buscar el historial activo actual
            const currentActiveHistory = await this.companyHistoryRepository.findOne({
              where: {
                user: { id: employee.id },
                company: { id: companyId },
                isActive: true
              }
            });

            // Usar historial activo si existe, sino el más reciente
            relevantHistory = currentActiveHistory || userHistory;
          }

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
              position: employee.profession,
              department: employee.profession,
              isActive: relevantHistory.isActive,
              duration: {
                days: diffDays,
                months: diffMonths,
                years: diffYears,
                displayText: this.formatDuration(diffYears, diffMonths, diffDays)
              }
            };
          }

          // Obtener education, socialLinks, references, experiences
          // Si las relaciones no están cargadas, hacer fetch manual
          let education = employee.education;
          let socialLinks = employee.socialLinks;
          let references = employee.references;
          let experiences = employee.experiences;

          // Si alguna relación no está presente, hacer fetch manual
          if (!education || !socialLinks || !references || !experiences) {
            const userWithRelations = await this.userRepository.findOne({
              where: { id: employee.id },
              relations: [
                "education",
                "socialLinks",
                "references",
                "experiences"
              ]
            });

            education = userWithRelations?.education || [];
            socialLinks = userWithRelations?.socialLinks || [];
            references = userWithRelations?.references || [];
            experiences = userWithRelations?.experiences || [];
          }

          return {
            ...employee,
            currentEmployment: employmentInfo,
            education,
            socialLinks,
            references,
            experiences
          };
        })
      );

      const totalPages = Math.ceil(total / limit);

      return {
        data: enrichedEmployees as any,
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

  async updateLocation(
    id: string,
    updateLocationDto: UpdateCompanyLocationDto,
  ): Promise<Company> {
    const company = await this.findOne(id);

    try {
      // Actualizar solo los campos de ubicación
      Object.assign(company, updateLocationDto);
      return await this.companyRepository.save(company);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async getLocation(id: string): Promise<{
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    country: string;
  }> {
    const company = await this.findOne(id);

    return {
      latitude: company.latitude,
      longitude: company.longitude,
      address: company.address,
      city: company.city,
      country: company.country,
    };
  }

  async findByUserId(userId: number): Promise<Company | null> {
    try {
      const company = await this.companyRepository.findOne({
        where: { user: { id: userId } },
        relations: ["user"],
      });

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async updateCheckInTime(
    companyId: string,
    checkInTime: string,
  ): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company) {
        throw new NotFoundException("Company not found");
      }

      company.checkInTime = checkInTime;
      await this.companyRepository.save(company);

      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getCompanyAttendanceStats(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
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
        relations: ["employees"],
      });

      if (!company) {
        throw new NotFoundException("Company not found");
      }

      // Obtener todas las asistencias de los empleados de la empresa en el rango de fechas
      const attendances = await this.attendanceRepository.find({
        where: {
          employee: { employer: { id: companyId } },
          date: Between(startDate, endDate),
          isAbsent: false, // Solo contar días trabajados
        },
        relations: ["employee"],
      });

      const totalAttendanceRecords = attendances.length;
      const lateArrivals = attendances.filter((a) => a.isLate).length;
      const onTimeArrivals = totalAttendanceRecords - lateArrivals;
      const latePercentage =
        totalAttendanceRecords > 0
          ? (lateArrivals / totalAttendanceRecords) * 100
          : 0;

      // Estadísticas por empleado
      const employeeStatsMap = new Map();

      attendances.forEach((attendance) => {
        const employeeId = attendance.employee.id;
        const employeeName = attendance.employee.name;

        if (!employeeStatsMap.has(employeeId)) {
          employeeStatsMap.set(employeeId, {
            employeeId,
            employeeName,
            totalDays: 0,
            lateDays: 0,
            onTimeDays: 0,
            latePercentage: 0,
          });
        }

        const stats = employeeStatsMap.get(employeeId);
        stats.totalDays++;

        if (attendance.isLate) {
          stats.lateDays++;
        } else {
          stats.onTimeDays++;
        }

        stats.latePercentage =
          stats.totalDays > 0 ? (stats.lateDays / stats.totalDays) * 100 : 0;
      });

      const employeeStats = Array.from(employeeStatsMap.values());

      return {
        companyCheckInTime: company.checkInTime || "07:00",
        totalEmployees: company.employees.length,
        totalAttendanceRecords,
        lateArrivals,
        onTimeArrivals,
        latePercentage: Math.round(latePercentage * 100) / 100,
        employeeStats,
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

    if (error.code === "23505") {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }

  private handleDBExceptions(error: any) {
    if (error.code === "23505") throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }

  private formatDuration(years: number, months: number, days: number): string {
    const parts = [];

    if (years > 0) {
      parts.push(`${years} año${years > 1 ? "s" : ""}`);
    }

    if (months > 0) {
      const remainingMonths = months % 12;
      if (remainingMonths > 0) {
        parts.push(`${remainingMonths} mes${remainingMonths > 1 ? "es" : ""}`);
      }
    }

    if (parts.length === 0) {
      if (days === 0) {
        return "Menos de 1 día";
      } else if (days < 30) {
        return `${days} día${days > 1 ? "s" : ""}`;
      } else {
        const monthsFromDays = Math.floor(days / 30);
        const remainingDays = days % 30;
        if (remainingDays > 0) {
          return `${monthsFromDays} mes${monthsFromDays > 1 ? "es" : ""} y ${remainingDays} día${remainingDays > 1 ? "s" : ""}`;
        } else {
          return `${monthsFromDays} mes${monthsFromDays > 1 ? "es" : ""}`;
        }
      }
    }

    return parts.join(" y ");
  }
}
