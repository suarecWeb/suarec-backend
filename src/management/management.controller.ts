import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ManagementService } from './management.service';
import { CreateManagementDto } from './dto/create-management.dto';
import { UpdateManagementDto } from './dto/update-management.dto';

@Controller('management')
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Post()
  create(@Body() createManagementDto: CreateManagementDto) {
    return this.managementService.create(createManagementDto);
  }

  @Get()
  findAll() {
    return this.managementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.managementService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateManagementDto: UpdateManagementDto) {
    return this.managementService.update(+id, updateManagementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.managementService.remove(+id);
  }
}
