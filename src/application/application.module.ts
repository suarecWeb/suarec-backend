import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationService } from './services/application.service';
import { 
  ApplicationController, 
  CompanyApplicationController, 
  UserApplicationController, 
  PublicationApplicationController 
} from './controllers/application.controller';
import { Application } from './entities/application.entity';
import { User } from '../user/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { Company } from '../company/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, User, Publication, Company])],
  controllers: [
    ApplicationController,
    CompanyApplicationController,
    UserApplicationController,
    PublicationApplicationController
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}