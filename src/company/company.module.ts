import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { Company } from './entities/company.entity';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [TypeOrmModule, CompanyService],
  imports: [
    TypeOrmModule.forFeature([Company, User]), 
    ConfigModule,
    forwardRef(() => UserModule), // Referencia circular para evitar problemas de dependencia
  ]
})
export class CompanyModule {}