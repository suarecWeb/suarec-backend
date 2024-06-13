import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Role } from '../enums/role.enum';

describe('UserService', () => {
  let service: UserService;
  let userRepositoryMock: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let jwtServiceMock: JwtService;

  beforeEach(async () => {
    userRepositoryMock = {
     create: jest.fn((userDto) => ({
            id: 'u' + Math.floor(Math.random() * 100),
            ...userDto
        })),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      preload: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: { /* Mock methods if they're used in the service */ },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jwtServiceMock = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      const createUserDto = { email: 'test@example.com', password: 'testPassword', name: 'Test User', role: Role.USER };
      const expectedUser = { id: 'uuid', ...createUserDto, password: 'hashedPassword' };
  
      userRepositoryMock.create.mockReturnValue(expectedUser);
      userRepositoryMock.save.mockResolvedValue(expectedUser);
  
      const result = await service.create(createUserDto);
      expect(result).toEqual(expectedUser);
      expect(userRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User'
      }));
      expect(userRepositoryMock.save).toHaveBeenCalledWith(expectedUser);
    });
  
    it('should throw an error if the user cannot be created', async () => {
      const createUserDto = { email: 'test@example.com', password: 'testPassword', name: 'Test User', role: Role.USER};
      userRepositoryMock.create.mockImplementation(() => { throw new Error('Simulated failure'); });
  
      await expect(service.create(createUserDto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: 'uuid', email: 'user1@example.com' }];
      userRepositoryMock.find.mockResolvedValue(users);
  
      const result = await service.findAll();
      expect(result).toEqual(users);
    });
  });


  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = { id: 'uuid', email: 'user@example.com' };
      userRepositoryMock.findOne.mockResolvedValue(user);
  
      const result = await service.findOne('uuid');
      expect(result).toEqual(user);
    });
  
    it('should throw NotFoundException if no user is found', async () => {
      userRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid')).rejects.toThrow('User with ID uuid not found');
    });
  });
  
  
  
  // Add your tests here
});