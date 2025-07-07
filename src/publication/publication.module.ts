import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationService } from '../publication/services/publication.service';
import { PublicationController } from '../publication/controllers/publication.controller';
import { Publication } from './entities/publication.entity';
import { User } from '../user/entities/user.entity';
import { Application } from '../application/entities/application.entity';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publication, User, Application]), ApplicationModule],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
