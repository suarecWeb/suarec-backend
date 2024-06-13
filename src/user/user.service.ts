import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import {v4 as uuid} from 'uuid';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {

      const { password, ...userData } = createUserDto;
      
      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });

      await this.userRepository.save( user )
      

      return user;
      

    } catch (error) {
      this.handleDBErrors(error);
    }

  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user: User = await this.userRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
  /* istanbul ignore next */
  async findByEmail(email: string) {

    const user: User = await this.userRepository.findOne({
      where: { email }
    });

    if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }
  /* istanbul ignore next */
  async update(id: string, updateUserDto: UpdateUserDto) {

    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto
    });

    if ( !user ) throw new NotFoundException(`User with id: ${ id } not found`);

    try {
      await this.userRepository.save( user );
      return user;
      
    } catch (error) {
      this.handleDBErrors(error);
    }
   
  }
  /* istanbul ignore next */
  async remove(id: string) {
    const user = await this.findOne( id );
    await this.userRepository.delete(id);
  }

  async populateWithSeedData(users: User[]) {
    try {
      const crypPasswordUers = users.map(user => {
        return {
          ...user,
          password: bcrypt.hashSync(user.password, 10)
        }
      })
      await this.userRepository.save(crypPasswordUers);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }
  /* istanbul ignore next */
  private handleDBErrors( error: any ): never {


    if ( error.code === '23505' ) 
      throw new BadRequestException( error.detail );

    console.log(error)

    throw new InternalServerErrorException('Please check server logs');

  }
}