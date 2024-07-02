import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Company } from '../company/entities/company.entity';

@Module({
  controllers: [UsersController],
  providers: [UsersService, JwtService, Repository],
  exports: [UsersService, UsersModule, TypeOrmModule],
  imports: [forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([Comment, User, Company]), 
    ConfigModule
  ]
})
export class UsersModule {}
