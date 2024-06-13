
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import  {v4 as uuid} from 'uuid';

describe('BookingController (e2e)', () => {
  let app: INestApplication;
  let bookingId: string;  
  let tokenId: string; // Token to be used in authenticated requests
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/user/register (POST) should create a user and log in', async () => {
    const createUserDto = {
      email: 'yaaa248823a@example.com',
      password: 'testPassword',
      name: 'TestUser',
      role: 'OWNER'
    };

    // Register the user
    const response = await request(app.getHttpServer())
      .post('/user/register')
      .send(createUserDto)
      .expect(HttpStatus.CREATED);

      userId = response.body.id; 

    // Log in the user
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: createUserDto.email,
        password: createUserDto.password
      })
      .expect(HttpStatus.OK);

    // Extract the token from the authorization header
    tokenId = loginResponse.body.access_token;
    if (!tokenId) {
      throw new Error('Token not found in the login response');
    }
  });

  it('/booking (POST) should create a booking', async () => {
    const bookingDto = {
      check_in: new Date(),
      check_out: new Date(),
      property_type: 'Apartment',
      property_id: uuid(),
      user_id: uuid(),
      num_people: 2,
      payment_method: 'Credit_card',
      is_paid: true,
      is_confirmed: false,
    };

    const response = await request(app.getHttpServer())
      .post('/booking')
      .set('Authorization', `Bearer ${tokenId}`) // Use the token
      .send(bookingDto)
      .expect(HttpStatus.CREATED);
      
    bookingId = response.body.id;  
    expect(response.body).toMatchObject({
      id: expect.any(String),
      property_id: bookingDto.property_id,
      user_id: bookingDto.user_id,
      num_people: bookingDto.num_people,
      payment_method: bookingDto.payment_method,
      is_paid: bookingDto.is_paid,
      is_confirmed: bookingDto.is_confirmed,
      check_in: expect.any(String),
      check_out: expect.any(String)
    });
  });

  it('/booking (GET) should return all bookings', async () => {
    await request(app.getHttpServer())
      .get(`/booking/${bookingId}`)
      .set('Authorization', `Bearer ${tokenId}`) // Use the token
      .expect(HttpStatus.OK)
      .then(response => {
        expect(response.body).toBeInstanceOf(Object);
      });
  });

  it('/booking/:id (PATCH) should update a booking', async () => {
    const updatedBookingDto = { num_people: 3 };
    await request(app.getHttpServer())
      .patch(`/booking/${bookingId}`)
      .set('Authorization', `Bearer ${tokenId}`) // Use the token
      .send(updatedBookingDto)
      .expect(HttpStatus.OK)
      .then(response => {
        expect(response.body.num_people).toEqual(updatedBookingDto.num_people);
      });
  });

  it('/booking/:id (DELETE) should delete a booking', async () => {
    await request(app.getHttpServer())
      .delete(`/booking/${bookingId}`)
      .set('Authorization', `Bearer ${tokenId}`) // Use the token
      .expect(HttpStatus.OK);
  });

  it('/user/:id (DELETE) should remove a user', async () => {
    await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});