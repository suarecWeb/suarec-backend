import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationService } from '../publication/services/publication.service';
import { PublicationController } from '../publication/controllers/publication.controller';
import { Publication } from './entities/publication.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Publication])],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
