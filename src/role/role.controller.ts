import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('roles')
@UseGuards(RolesGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.roleService.remove(+id);
  }
}
