import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Roles } from '../auth/decorators/role.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';

@Controller('permissions')
@UseGuards(RolesGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto);
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(+id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionService.update(+id, updatePermissionDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.permissionService.remove(+id);
  }
}
