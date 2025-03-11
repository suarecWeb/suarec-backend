import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PublicationService } from '../services/publication.service';
import { CreatePublicationDto } from '../dto/create-publication.dto';
import { UpdatePublicationDto } from '../dto/update-publication.dto';
import { AuthGuard } from '../../auth/guard/auth.guard'
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Publication } from '../entities/publication.entity';

@Controller('publications')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Post()
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  create(@Body() createPublicationDto: CreatePublicationDto): Promise<Publication> {
    return this.publicationService.create(createPublicationDto);
  }

  @Get()
  @Roles('ADMIN', 'BUSINESS', 'USER')
  @UseGuards(AuthGuard, RolesGuard)
  findAll(): Promise<Publication[]> {
    return this.publicationService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BUSINESS', 'USER')
  @UseGuards(AuthGuard, RolesGuard)
  findOne(@Param('id') id: string): Promise<Publication> {
    return this.publicationService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BUSINESS', 'USER')
  @UseGuards(AuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() updatePublicationDto: UpdatePublicationDto): Promise<Publication> {
    return this.publicationService.update(id, updatePublicationDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.publicationService.remove(id);
  }
}
