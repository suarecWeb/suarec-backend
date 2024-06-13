import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/guards/auth.guard';
import { forwardRef } from '@nestjs/common';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService,TypeOrmModule],
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([Property]),
  ],
})
export class PropertyModule {}

