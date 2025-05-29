import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { UpdateCompanyLocationDto } from '../dto/update-company-location.dto';
import { User } from '../../user/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class CompanyService {
 
  private readonly logger = new Logger('CompanyService');

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
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

  async addEmployeeEmail(companyEmail: string, userId: number): Promise<Company> {
    try {
      const company = await this.findOneEmail(companyEmail);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      await this.userRepository.save(user);

      // Devolver la empresa actualizada con sus empleados
      return this.findOneEmail(companyEmail);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }  

  async addEmployee(companyId: string, userId: number): Promise<Company> {
    try {
      const company = await this.findOne(companyId);
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Asignar la empresa al usuario como su empleador
      user.employer = company;
      await this.userRepository.save(user);

      // Devolver la empresa actualizada con sus empleados
      return this.findOne(companyId);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async removeEmployee(companyId: string, userId: number): Promise<Company> {
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

      // Eliminar la relación de empleado
      user.employer = null;
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

      const [employees, total] = await this.userRepository.findAndCount({
        where: { employer: { id: company.id } },
        relations: ['roles'],
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: employees,
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
}