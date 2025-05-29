import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { UpdateCompanyLocationDto } from '../dto/update-company-location.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { LocationGuard } from '../../auth/guard/location.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Company } from '../entities/company.entity';
import { Public } from '../../auth/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { Req } from '@nestjs/common';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    console.log('Creating company...' + createCompanyDto.email + createCompanyDto.nit + createCompanyDto.userId)
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all companies with pagination' })
  @ApiQuery({ type: PaginationDto })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginationResponse<Company>> {
    return this.companyService.findAll(paginationDto);
  }

  @Get(':id')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a company by id' })
  findOne(@Param('id') id: string): Promise<Company> {
    return this.companyService.findOne(id);
  }
    
  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a company' })
  remove(@Param('id') id: string): Promise<void> {
    return this.companyService.remove(id);
  }

  @Get(':id/location')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard, LocationGuard)
  @ApiOperation({ summary: 'Get company location' })
  @ApiResponse({ status: 200, description: 'Returns the company location' })
  getLocation(@Param('id') id: string) {
    return this.companyService.getLocation(id);
  }

  @Patch(':id/location')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard, LocationGuard)
  @ApiOperation({ summary: 'Update company location' })
  @ApiResponse({ status: 200, description: 'Company location updated successfully' })
  updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateCompanyLocationDto,
    @Req() req: Request
  ) {
    console.log('Entrando a updateLocation, usuario:', req.user);
    return this.companyService.updateLocation(id, updateLocationDto);
  }
}