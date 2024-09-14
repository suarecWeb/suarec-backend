import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './/permission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { Permission } from './entities/permission.entity';
import { RolePermission } from '../role_permission/entities/role_permission.entity';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionModule, TypeOrmModule, Repository],
  imports: [
    TypeOrmModule.forFeature([Permission, RolePermission]), 
    ConfigModule, 
    Repository
  ]
})
export class PermissionModule {}
