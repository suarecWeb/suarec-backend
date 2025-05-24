import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApplicationService } from '../services/application.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Application } from '../entities/application.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(AuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles('PERSON', 'ADMIN')
  @ApiOperation({ summary: 'Create a new application' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  create(@Body() createApplicationDto: CreateApplicationDto): Promise<Application> {
    return this.applicationService.create(createApplicationDto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all applications with pagination (admin only)' })
  @ApiQuery({ type: PaginationDto })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginationResponse<Application>> {
    return this.applicationService.findAll(paginationDto);
  }

  @Get('check/:userId/:publicationId')
  @Roles('PERSON', 'BUSINESS', 'ADMIN')
  @ApiOperation({ summary: 'Check if user has already applied to publication' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'publicationId', description: 'Publication ID' })
  checkUserApplication(
    @Param('userId') userId: string,
    @Param('publicationId') publicationId: string
  ): Promise<{ hasApplied: boolean; application?: Application }> {
    return this.applicationService.checkUserApplication(+userId, publicationId);
  }

  @Get(':id')
  @Roles('PERSON', 'BUSINESS', 'ADMIN')
  @ApiOperation({ summary: 'Get an application by id' })
  findOne(@Param('id') id: string): Promise<Application> {
    return this.applicationService.findOne(id);
  }

  @Patch(':id')
  @Roles('BUSINESS', 'ADMIN')
  @ApiOperation({ summary: 'Update application status (business/admin only)' })
  update(@Param('id') id: string, @Body() updateApplicationDto: UpdateApplicationDto): Promise<Application> {
    return this.applicationService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  @Roles('PERSON', 'ADMIN')
  @ApiOperation({ summary: 'Delete an application' })
  remove(@Param('id') id: string): Promise<void> {
    return this.applicationService.remove(id);
  }
}

// Controlador adicional para endpoints específicos por entidad
@ApiTags('Company Applications')
@Controller('companies/:companyId/applications')
@UseGuards(AuthGuard, RolesGuard)
export class CompanyApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @Roles('BUSINESS', 'ADMIN')
  @ApiOperation({ summary: 'Get applications for company publications' })
  @ApiParam({ name: 'companyId', description: 'Company ID (User ID of company owner)' })
  @ApiQuery({ type: PaginationDto })
  getCompanyApplications(
    @Param('companyId') companyId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResponse<Application>> {
    return this.applicationService.getCompanyApplications(+companyId, paginationDto);
  }
}

@ApiTags('User Applications')
@Controller('users/:userId/applications')
@UseGuards(AuthGuard, RolesGuard)
export class UserApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @Roles('PERSON', 'ADMIN')
  @ApiOperation({ summary: 'Get applications made by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ type: PaginationDto })
  getUserApplications(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResponse<Application>> {
    return this.applicationService.getUserApplications(+userId, paginationDto);
  }
}

@ApiTags('Publication Applications')
@Controller('publications/:publicationId/applications')
@UseGuards(AuthGuard, RolesGuard)
export class PublicationApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @Roles('BUSINESS', 'PERSON', 'ADMIN')
  @ApiOperation({ summary: 'Get applications for a specific publication' })
  @ApiParam({ name: 'publicationId', description: 'Publication ID' })
  @ApiQuery({ type: PaginationDto })
  getPublicationApplications(
    @Param('publicationId') publicationId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResponse<Application>> {
    return this.applicationService.getPublicationApplications(publicationId, paginationDto);
  }
}