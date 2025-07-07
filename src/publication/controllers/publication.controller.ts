import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PublicationService } from '../services/publication.service';
import { CreatePublicationDto } from '../dto/create-publication.dto';
import { UpdatePublicationDto } from '../dto/update-publication.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Publication } from '../entities/publication.entity';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApplicationService } from '../../application/services/application.service';

@ApiTags('Publications')
@Controller('publications')
export class PublicationController {
  constructor(
    private readonly publicationService: PublicationService,
    private readonly applicationService: ApplicationService
  ) {}

  @Post()
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new publication' })
  @ApiResponse({ status: 201, description: 'Publication created successfully' })
  create(@Body() createPublicationDto: CreatePublicationDto): Promise<Publication> {
    return this.publicationService.create(createPublicationDto);
  }

  @Get()
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all publications with pagination' })
  @ApiQuery({ type: PaginationDto })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findAll(paginationDto) as Promise<PaginationResponse<Publication>>;
  }

  @Get(':id')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a publication by id' })
  findOne(@Param('id') id: string): Promise<Publication> {
    return this.publicationService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a publication' })
  update(@Param('id') id: string, @Body() updatePublicationDto: UpdatePublicationDto): Promise<Publication> {
    return this.publicationService.update(id, updatePublicationDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a publication' })
  remove(@Param('id') id: string): Promise<void> {
    return this.publicationService.remove(id);
  }

  @Get(':id/applications')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get applications for a publication' })
  @ApiQuery({ type: PaginationDto })
  async getApplicationsForPublication(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.applicationService.getPublicationApplications(id, paginationDto);
  }
}