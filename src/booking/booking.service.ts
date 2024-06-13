import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { isUUID } from 'class-validator';
import { Property } from 'src/property/entities/property.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class BookingService {
  private readonly logger = new Logger('BookingService');

  constructor(
    @InjectRepository(Booking)
      private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // verifica la existencia de la propiedad
  async verifyProperty(propertyId: string): Promise<boolean> {
    const properties = await this.propertyRepository.find();

    return properties.some(prop => prop.id === propertyId);
  }
  // verifica la existencia del usuario
  async verifyUser(userId: string): Promise<boolean> {
    const users = await this.userRepository.find();

    return users.some(user => user.id === userId);
  }

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    try {
      const propertyToBook = createBookingDto.property_id;
      const userBooking = createBookingDto.user_id;

      if ((await this.verifyUser(userBooking)) == true && (await this.verifyProperty(propertyToBook)) == true){
        const booking = this.bookingRepository.create(createBookingDto);
        await this.bookingRepository.save(booking);
        return booking;
      } else {
        throw new NotFoundException(`Property with ID "${propertyToBook}" OR User with ID "${userBooking}" not found`);
      }
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }


  async findAll(): Promise<Booking[]> {
    return await this.bookingRepository.find();
  }

  async findOne(id: string): Promise<Booking> {
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid identifier');
    }
    const booking = await this.bookingRepository.findOneBy({ id });
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }
    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.bookingRepository.preload({
      id: id,
      ...updateBookingDto
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }
    try {
      await this.bookingRepository.save(booking);
      return booking;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id); 
    await this.bookingRepository.remove(booking);
  }

  async populateWithSeedData(bookings: Booking[]) {
    try {
      await this.bookingRepository.save(bookings);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(`Database error: ${error.message}`, error.trace);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}