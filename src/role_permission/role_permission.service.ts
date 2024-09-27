import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRolePermissionDto } from './dto/create-role_permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role_permission.dto';
import { RolePermission } from './entities/role_permission.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createRolePermissionDto: CreateRolePermissionDto) {
    const { roleName, permissionName } = createRolePermissionDto;

    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException(`Role with name ${roleName} not found`);
    }

    const permission = await this.permissionRepository.findOne({ where: { name: permissionName } });
    if (!permission) {
      throw new NotFoundException(`Permission with name ${permissionName} not found`);
    }

    const rolePermission = this.rolePermissionRepository.create({
      role,
      permission,
    });

    return this.rolePermissionRepository.save(rolePermission);
  }

  findAll() {
    return this.rolePermissionRepository.find({ relations: ['role', 'permission'] });
  }

  async findOne(id: string) {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
      relations: ['role', 'permission'],
    });
    if (!rolePermission) {
      throw new NotFoundException(`RolePermission with ID ${id} not found`);
    }
    return rolePermission;
  }

  async update(id: string, updateRolePermissionDto: UpdateRolePermissionDto) {
    const { roleName, permissionName } = updateRolePermissionDto;

    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
    });
    if (!rolePermission) {
      throw new NotFoundException(`RolePermission with ID ${id} not found`);
    }

    if (roleName) {
      const role = await this.roleRepository.findOne({ where: { name: roleName } });
      if (!role) {
        throw new NotFoundException(`Role with name ${roleName} not found`);
      }
      rolePermission.role = role;
    }

    if (permissionName) {
      const permission = await this.permissionRepository.findOne({ where: { name: permissionName } });
      if (!permission) {
        throw new NotFoundException(`Permission with name ${permissionName} not found`);
      }
      rolePermission.permission = permission;
    }

    return this.rolePermissionRepository.save(rolePermission);
  }

  async remove(id: string) {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
    });
    if (!rolePermission) {
      throw new NotFoundException(`RolePermission with ID ${id} not found`);
    }
    return this.rolePermissionRepository.remove(rolePermission);
  }
}
