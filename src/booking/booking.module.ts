import { Module, forwardRef } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AuthModule } from '../auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Booking } from './entities/booking.entity';
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Property } from 'src/property/entities/property.entity';

@Module({
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService, TypeOrmModule],
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([Booking, User, Property]),
  ]

})
export class BookingModule {}
