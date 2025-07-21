import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { BulkEmployeeService } from './services/bulk-employee.service';
import { Company } from './entities/company.entity';
import { CompanyGallery } from './entities/company-gallery.entity';
import { CompanyHistory } from './entities/company-history.entity';
import { CompanyGalleryService } from './services/gallery.service';
import { User } from '../user/entities/user.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { UserModule } from '../user/user.module';
import { Role } from '../role/entities/role.entity';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyGalleryService, BulkEmployeeService],
  exports: [TypeOrmModule, CompanyService, CompanyGalleryService],
  imports: [
    TypeOrmModule.forFeature([Company, User, CompanyGallery, CompanyHistory, Attendance, Role]), 
    ConfigModule,
    forwardRef(() => UserModule), // Referencia circular para evitar problemas de dependencia
  ]
})
export class CompanyModule {}