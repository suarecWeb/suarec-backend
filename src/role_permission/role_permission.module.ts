import { Module } from '@nestjs/common';
import { RolePermissionService } from './role_permission.service';
import { RolePermissionController } from './role_permission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { RolePermission } from './entities/role_permission.entity';
import { Permission } from '../permission/entities/permission.entity';
import { Role } from '../role/entities/role.entity';

@Module({
  controllers: [RolePermissionController],
  providers: [RolePermissionService],
  exports: [RolePermissionModule, TypeOrmModule, Repository],
  imports: [
    TypeOrmModule.forFeature([RolePermission, Permission, Role]), 
    ConfigModule, 
    Repository
  ]
})
export class RolePermissionModule {}
