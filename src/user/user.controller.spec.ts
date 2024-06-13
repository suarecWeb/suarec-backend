import { User } from './entities/user.entity';
import { Role } from '../enums/role.enum';
import { UserController } from './user.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthModule } from '../auth/auth.module';
import { AppModule } from '../app.module';

describe('User Entity', () => {
    let controller: UserController;

    let users = [
        { id: 'u1', email: 'user1@example.com', password: 'pass123', name: 'User One', role: Role.USER },
        { id: 'u2', email: 'user2@example.com', password: 'pass123', name: 'User Two', role: Role.ADMIN },
        { id: 'u3', email: 'user3@example.com', password: 'pass123', name: 'User Three', role: Role.OWNER }
    ];

    const mockUserService = {
        create: jest.fn((userDto) => ({
          id: 'u' + Math.floor(Math.random() * 100),
          ...userDto
        })),
    
        findAll: jest.fn(() => users),
    
        findOne: jest.fn((id) => users.find(user => user.id === id)),
    
        update: jest.fn((id, updateUserDto) => ({
          id: id,
          ...updateUserDto,
        })),
    
        remove: jest.fn((id) => users = users.filter(user => user.id !== id))
      }

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          controllers: [UserController],
          providers: [UserService],
          imports: [AuthModule, AppModule]
        }).overrideProvider(UserService)
        .useValue(mockUserService)
        .compile();
    
        controller = module.get<UserController>(UserController);
      });

      it('should be defined', () => {
        expect(controller).toBeDefined();
      });
    
      it('should create a user', async () => {
        const dto = {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: Role.USER
        };
    
        const result = await controller.create(dto); // Usa await para resolver la promesa

            expect(result).toEqual({
                id: expect.any(String),
                ...dto
            });

    
        expect(mockUserService.create).toHaveBeenCalledWith(dto);
        expect(mockUserService.create).toHaveBeenCalledTimes(1);
      });
    
      it('should get a user by ID', () => {
        expect(controller.findOne('u1')).toEqual({
          id: 'u1',
          email: 'user1@example.com',
          password: 'pass123',
          name: 'User One',
          role: Role.USER
        });
    
        expect(mockUserService.findOne).toHaveBeenCalledWith('u1');
        expect(mockUserService.findOne).toHaveBeenCalledTimes(1);
      });
    
      it('should get all users', () => {
        expect(controller.findAll()).toEqual(users);
        expect(mockUserService.findAll).toHaveBeenCalled();
      });
    
    it('should update a user', () => {
        const updateUserDto: UpdateUserDto = {
            id: 'u1',
            email: 'updateduser@example.com',
            name: 'Updated Name'
        };
        expect(controller.update('u1', updateUserDto)).toEqual({
            id: 'u1',
            ...updateUserDto
        });
        expect(mockUserService.update).toHaveBeenCalledWith('u1', updateUserDto);
    });
    
      it('should remove a user', () => {
        controller.remove('u1');
        expect(mockUserService.remove).toHaveBeenCalledWith('u1');
      });
    

    
});