import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpCode, HttpStatus, INestApplication } from '@nestjs/common';
import  {v4 as uuid} from 'uuid';
import { PropertyType } from 'src/enums/propertyType.enum';

describe('PropertyController (e2e)', () => {
    let app: INestApplication;
    let propertyId: string;  
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
          email: 'funcionapuesomecarecjimba@example.com',
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
      
      // POST
      it('/property (POST) should create a property', async () => {
        const propertyDto = {
            type: 'HOUSE',
            country: 'USA',
            city: 'New York',
            address: '123 Main St',
            latitude: 40.7128,
            altitude: -74.0060,
            rooms: 3,
            bathrooms: 2,
            area: 150,
            cost_per_night: 200,
            max_people: 6,
            slug: 'usa-new-york-123-main-st'
        };
    
        const response = await request(app.getHttpServer())
          .post('/property')
          .set('Authorization', `Bearer ${tokenId}`) // Use the token
          .send(propertyDto)
          .expect(HttpStatus.CREATED);
          
        propertyId = response.body.id;  
        expect(response.body).toMatchObject({
            id: expect.any(String),
            type: 'HOUSE',
            country: 'USA',
            city: 'New York',
            address: '123 Main St',
            latitude: 40.7128,
            altitude: -74.0060,
            rooms: 3,
            bathrooms: 2,
            area: 150,
            cost_per_night: 200,
            max_people: 6,
            slug: 'usa-new-york-123-main-st'
        });
      });

      // GET ALL
      it('/booking (GET) should return all properties', async () => {
        await request(app.getHttpServer())
          .get(`/property/${propertyId}`)
          .set('Authorization', `Bearer ${tokenId}`) // Use the token
          .expect(HttpStatus.OK)
          .then(response => {
            expect(response.body).toBeInstanceOf(Object);
          });
      });

      // PATCH - UPDATE
      it('/booking/:id (PATCH) should update a booking', async () => {
        const updatedProperty = { country: 'Updated New York' };

        await request(app.getHttpServer())
          .patch(`/property/${propertyId}`)
          .set('Authorization', `Bearer ${tokenId}`) // Use the token
          .send(updatedProperty)
          .expect(HttpStatus.OK)
          .then(response => {
            expect(response.body.country).toEqual(updatedProperty.country);
          });
      });
    
      // DELETE
      it('/booking/:id (DELETE) should delete a booking', async () => {
        await request(app.getHttpServer())
          .delete(`/property/${propertyId}`)
          .set('Authorization', `Bearer ${tokenId}`) // Use the token
          .expect(HttpStatus.OK);
      });
      
      // DELETE (user)
      it('/user/:id (DELETE) should remove a user', async () => {
        await request(app.getHttpServer())
          .delete(`/user/${userId}`)
          .expect(200);
      });
    
      afterAll(async () => {
        await app.close();
      });
});