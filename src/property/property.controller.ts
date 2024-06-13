import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
//Now that we have a custom @Roles() decorator, we can use it to decorate any route handler.
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

// TO DO: Return Types !!!
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  // create a new property
  @Roles(Role.OWNER)
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertyService.create(createPropertyDto);
  }

  // find all properties
  // pasamos como parametro el PaginationDto
  // que indica la cantidad max a mostrar y 
  // paginacion
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.propertyService.findAll();
  }

  // find a property with a specific ID
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log("slug: " + id)
    return this.propertyService.findOne(id);
  }

  @Roles(Role.OWNER)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertyService.update(id, updatePropertyDto);
  }

  @Roles(Role.OWNER)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertyService.remove(id);
  }
}