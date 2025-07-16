import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CompanyService } from './services/company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { CompanyGalleryService } from './services/gallery.service';
import { CreateCompanyGalleryImageDto, UpdateCompanyGalleryImageDto, UploadCompanyGalleryImagesDto } from './dto/gallery.dto';

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly galleryService: CompanyGalleryService,
  ) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  findAll(@Query() query: any) {
    const paginationDto = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
    };
    return this.companyService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }

  // Endpoints para galería de fotos
  @UseGuards(AuthGuard)
  @Get('me/gallery')
  async getCompanyGallery(@Request() req) {
    // Asumiendo que el usuario autenticado tiene una empresa asociada
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.getCompanyGallery(company.id);
  }

  @UseGuards(AuthGuard)
  @Post('me/gallery')
  async addImageToGallery(@Request() req, @Body() createDto: CreateCompanyGalleryImageDto) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.addImageToGallery(company.id, createDto);
  }

  @UseGuards(AuthGuard)
  @Post('me/gallery/upload-multiple')
  async uploadMultipleImages(@Request() req, @Body() uploadDto: UploadCompanyGalleryImagesDto) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.uploadMultipleImages(company.id, uploadDto);
  }

  @UseGuards(AuthGuard)
  @Patch('me/gallery/:imageId')
  async updateImage(@Request() req, @Param('imageId') imageId: string, @Body() updateDto: UpdateCompanyGalleryImageDto) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.updateImage(company.id, +imageId, updateDto);
  }

  @UseGuards(AuthGuard)
  @Delete('me/gallery/:imageId')
  async deleteImage(@Request() req, @Param('imageId') imageId: string) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.deleteImage(company.id, +imageId);
  }

  @UseGuards(AuthGuard)
  @Post('me/gallery/reorder')
  async reorderImages(@Request() req, @Body() body: { imageIds: number[] }) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return this.galleryService.reorderImages(company.id, body.imageIds);
  }
} 