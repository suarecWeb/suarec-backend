import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { Role } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { RolePermission } from '../role_permission/entities/role_permission.entity';

@Module({
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleModule, TypeOrmModule, Repository],
  imports: [
    TypeOrmModule.forFeature([Role, User, RolePermission]), 
    ConfigModule, 
    Repository
  ]
})
export class RoleModule {}
