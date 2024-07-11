import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { Company } from './entities/company.entity';
import { Comment } from '../comment/entities/comment.entity';


@Module({
  controllers: [CompanyController],
  providers: [UsersService, CompanyService, Repository],
  exports: [TypeOrmModule, Repository],
  imports: [
    TypeOrmModule.forFeature([Company, User, Comment]), 
    ConfigModule, 
    Repository
  ]
})
export class CompanyModule {}
