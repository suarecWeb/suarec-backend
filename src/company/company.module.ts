import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { Company } from './entities/company.entity';
import { Comment } from '../comment/entities/comment.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, Repository],
  exports: [TypeOrmModule, CompanyService, Repository],
  imports: [
    TypeOrmModule.forFeature([Company, User, Comment, Role, Permission]), 
    ConfigModule,
    forwardRef(() => UserModule), // Referencia circular para evitar problemas de dependencia
    Repository
  ]
})
export class CompanyModule {}