import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking } from './entities/booking.entity';
import { PropertyType } from '../enums/propertyType.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthModule } from '../auth/auth.module';
import { AppModule } from '../app.module';
import  {v4 as uuid} from 'uuid';
import { PaymentMethod } from '../enums/paymentMethod.enum';

describe('BookingController', () => {
  let controller: BookingController;
  let date2 = new Date();
  let bookings = [
    {
      id: '123',
      check_in: date2,
      check_out: date2,
      property_type: PropertyType.Apartment,
      property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
      user_id: '1196240a-cece-4230-83a3-bf724644f2fa',
      num_people: 2,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
  },
  {
    id: '1234',
    check_in: date2,
    check_out: date2,
    property_type: PropertyType.Apartment,
    property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
    user_id: '1196240a-cece-4230-83a3-bf724644f2fa',
    num_people: 3,
    payment_method: PaymentMethod.Credit_card,
    is_paid: true,
    is_confirmed: false,
  },
  {
    id: '12345',
    check_in: date2,
    check_out: date2,
    property_type: PropertyType.Apartment,
    property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
    user_id: '1196240a-cece-4230-83a3-bf724644f2fa',
    num_people: 4,
    payment_method: PaymentMethod.Credit_card,
    is_paid: true,
    is_confirmed: false,
  }
  ];

  // simulamos el servicio
  // debe haber correspondencia en
  // nombres del servicio real
  // y el mock
  const mockBookingService = {
    // create property
    create: jest.fn( (bookingDto) => 
    ({
      id: 'a' + Math.floor(Math.random() * 100),
      ...bookingDto
    }) ),

    // get properties
    findAll: jest.fn( () => 
    (
      bookings
    )),

    // get property (slug o ID)
    findOne: jest.fn( (term) => {
      const byID = bookings.find(booking => booking.id === term);
  
    }),

    // update
    update: jest.fn( (id, updateBookingDto) => ({
      id: id,
      ...updateBookingDto,
    })),

    // delete
    remove: jest.fn( (id) => bookings.filter(booking => !id.includes(booking.id)))
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [BookingService],
      imports: [AuthModule, AppModule],
    }).overrideProvider(BookingService)
    .useValue(mockBookingService)
    .compile();;

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  let date = new Date();
  // create booking
  it('should create a booking', () => {
    const dto = {
      id: '123',
      check_in: date,
      check_out: date,
      property_type: PropertyType.Apartment,
      property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
      user_id:'3d2fc0d6-0334-46b5-966d-cb6bfd953e25',
      num_people: 2,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
    };

    expect(controller.create(dto)).toEqual({
      id: expect.any(String),
      check_in: date,
      check_out: date,
      property_type: PropertyType.Apartment,
      property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
      userId: '3d2fc0d6-0334-46b5-966d-cb6bfd953e25',
      num_people: 2,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
    });

    expect(mockBookingService.create).toHaveBeenCalledWith(dto);
    expect(mockBookingService.create).toHaveBeenCalledTimes(1);
  });

  // get a booking by ID
  it('should get a booking', () => {
    expect(controller.findOne('123')).toEqual(
      {
        id: '123',
        check_in: date,
        check_out: date,
        property_type: PropertyType.Apartment,
        property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
        userId:'3d2fc0d6-0334-46b5-966d-cb6bfd953e25',
        num_people: 2,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: false,
    }
    );

    expect(mockBookingService.findOne).toHaveBeenCalledWith('a3');
    expect(mockBookingService.findOne).toHaveBeenCalledTimes(1);
  });

  
  // get all bookings
  it('should get all bookings', () => {  
    const bookingsExp = [
      {
        id: '123',
      check_in: new Date(),
      check_out: new Date(),
      property_type: PropertyType.Apartment,
      property_id: uuid(),
      user_id: uuid(),
      num_people: 2,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
    },
    {
      id: '1234',
      check_in: new Date(),
      check_out: new Date(),
      property_type: PropertyType.Apartment,
      property_id: uuid(),
      user_id: uuid(),
      num_people: 3,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
    },
    {
      id: '12345',
      check_in: new Date(),
      check_out: new Date(),
      property_type: PropertyType.Apartment,
      property_id: uuid(),
      user_id: uuid(),
      num_people: 4,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,
    },
    ]
  });
  // update
  it('should update a booking', () => {  
    const editedBooking = 
      {
        id: '123',
        check_in: date,
        check_out: date,
        property_type: PropertyType.Apartment,
        property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
        userId:'3d2fc0d6-0334-46b5-966d-cb6bfd953e25',
        num_people: 3,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: false,
    }

    expect(controller.update('123', {
      check_in: date,
      check_out: date,
      property_type: PropertyType.Apartment,
      property_id: '1196240a-cece-4230-83a3-bf724644f2fa',
      user_id:'3d2fc0d6-0334-46b5-966d-cb6bfd953e25',
      num_people: 2,
      payment_method: PaymentMethod.Credit_card,
      is_paid: true,
      is_confirmed: false,

  })).toEqual(editedBooking);

    expect(mockBookingService.findAll).toHaveBeenCalledWith();
    expect(mockBookingService.findAll).toHaveBeenCalledTimes(1);
  });

  // delete
  it('should delete a bookings', () => {
    const bookingsAfterRemove = [
      {
        id: '1234',
        check_in: new Date(),
        check_out: new Date(),
        property_type: PropertyType.Apartment,
        property_id: uuid(),
        user_id: uuid(),
        num_people: 3,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: false,
      },
      {
        id: '12345',
        check_in: new Date(),
        check_out: new Date(),
        property_type: PropertyType.Apartment,
        property_id: uuid(),
        user_id: uuid(),
        num_people: 4,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: false,
      }
    
    ]

    expect(controller.remove('123')).toEqual(bookingsAfterRemove);

    expect(mockBookingService.findAll).toHaveBeenCalledWith();
    expect(mockBookingService.findAll).toHaveBeenCalledTimes(1);
  });
});