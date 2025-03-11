import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { permissionsIds, ...roleData } = createRoleDto;
    const role = this.roleRepository.create(roleData);
  
    if (permissionsIds) {
      const permissions = await this.permissionRepository.findByIds(permissionsIds);
      if (permissions.length !== permissionsIds.length) {
        throw new NotFoundException('Some permissions were not found');
      }
      role.permissions = permissions;
    }
  
    return this.roleRepository.save(role);
  }
  
  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const { permissionsIds, ...updateData } = updateRoleDto;
    const role = await this.roleRepository.preload({ id, ...updateData });
  
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
  
    if (permissionsIds) {
      const permissions = await this.permissionRepository.findByIds(permissionsIds);
      if (permissions.length !== permissionsIds.length) {
        throw new NotFoundException('Some permissions were not found');
      }
      role.permissions = permissions;
    }
  
    return this.roleRepository.save(role);
  }

  async findOneByName(name: string) {
    const role = await this.roleRepository.findOneBy({ name });
    return role;
  }

  findAll() {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    return this.roleRepository.remove(role);
  }
}