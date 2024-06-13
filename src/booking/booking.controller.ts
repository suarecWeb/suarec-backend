import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
//Now that we have a custom @Roles() decorator, we can use it to decorate any route handler.
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';


@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Roles(Role.OWNER, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Roles(Role.OWNER, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Roles(Role.OWNER, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(String(id));
  }

  @Roles(Role.OWNER, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(id, updateBookingDto);
  }

  @Roles(Role.OWNER, Role.USER)
  @UseGuards(AuthGuard, RolesGuard) 
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(String(id));
  }
}