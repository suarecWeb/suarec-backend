import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { User } from '../user/entities/user.entity';  // Asegúrate de que la ruta a la entidad es correcta
import { UserModule } from '../user/user.module';
import { BookingModule } from '../booking/booking.module';
import { PropertyModule } from '../property/property.module';

@Module({
  imports: [
    UserModule, BookingModule, PropertyModule
  ],
  providers: [SeedService],
  controllers: [SeedController]
})
export class SeedModule {}