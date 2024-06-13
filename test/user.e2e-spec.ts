import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpCode, HttpStatus, INestApplication } from '@nestjs/common';
import  {v4 as uuid} from 'uuid';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userId: string;  // Assuming you will use this to store the ID from the created user.

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/user/register (POST) should create a user', async () => {
    const createUserDto = {
      email: 'test@example5.com',
      password: 'testPassword',
      name: 'TestUser',
      role: 'OWNER'
    };

    const response = await request(app.getHttpServer())
      .post('/user/register')
      .send(createUserDto)
      .expect(201);

   
    userId = response.body.id; 
  });

  it('/user (GET) should return all users', async () => {
    await request(app.getHttpServer())
      .get('/user')
      .expect(HttpStatus.OK)
      .then(response => {
        expect(response.body).toBeInstanceOf(Array);
      });
  });

  it('/user/:id (PATCH) should update a user', async () => {
    const updateUserDto = {
      name: 'Updated Name'
    };

    await request(app.getHttpServer())
      .patch(`/user/${userId}`)
      .send(updateUserDto)
      .expect(HttpCode)
      .then(response => {
        expect(response.body).toHaveProperty('name', 'Updated Name');
      });
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