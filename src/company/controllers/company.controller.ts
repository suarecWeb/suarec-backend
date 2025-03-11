import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Company } from '../entities/company.entity';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Public()
  create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  findAll(): Promise<Company[]> {
    return this.companyService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'PERSON')
  @UseGuards(AuthGuard, RolesGuard)
  findOne(@Param('id') id: string): Promise<Company> {
    return this.companyService.findOne(id);
  }
  
  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.companyService.remove(id);
  }
}
