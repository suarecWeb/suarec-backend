import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Injectable()
export class CompanyService {

  private readonly logger = new Logger('CompanyService');

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      const existingCompany = await this.companyRepository.findOne({ where: { nit: createCompanyDto.nit } });
      if (existingCompany) {
        throw new BadRequestException('NIT already in use');
      }

      const company = this.companyRepository.create(createCompanyDto);
      await this.companyRepository.save(company);
      return company;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(): Promise<Company[]> {
    try {
      const companies = await this.companyRepository.find({ relations: ['user'] });
      return companies;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
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
}
