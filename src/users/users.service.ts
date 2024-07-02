import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';
//import { PageOptionsDto } from '../pagination/page-options.dto';
//import { PageDto } from '../pagination/page.dto';
//import { PageMetaDto } from '../pagination/page-meta.dto';

@Injectable()
export class UsersService {

  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    //@InjectRepository(Product)
    //private readonly productsRepository: Repository<Product>,
    private readonly jwtService: JwtService,
    //@InjectRepository(Order)
    //private readonly orderRepository: Repository<Order>,

  ) {}

  async create(createUserDto: CreateUserDto) {
    try {

      const { password, email, ...userData } = createUserDto;
      

      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }

      const user = this.usersRepository.create({
        ...userData,
        email: email,
        password: bcrypt.hashSync(password, 10),
        created_at: new Date(),
      });
      await this.usersRepository.save( user )
      

      return user;
      

    } catch (error) {
      this.handleDBErrors(error);
    }

  }

  async findByEmail(email: string) {
    const user: User = await this.usersRepository.findOne({
      where: { email }
    })
    
    if (!user) {
      throw new NotFoundException('Email not found, please register or try again.')
    }
    
    return user;
  }

  async findAll(/*pageOptionsDto: PageOptionsDto*/): Promise<User[]>{
    const [data, itemCount] = await this.usersRepository.findAndCount({
      relations: ['company'],
      /*skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      order:{
        id: pageOptionsDto.order
      }*/
    })

    //const pageMetaDto = new PageMetaDto({pageOptionsDto, itemCount});
    //return new PageDto(data, pageMetaDto);
    return data;
  }

  async findOne(id:string){
    const user = await this.usersRepository.findOne({
      where: {id},
      relations: ['addresses','products']
    })
    return user;
  }

  async update(id:string, updateDto: UpdateUserDto){
    
    const user = await this.usersRepository.preload({
      id: id,
      ...updateDto
    })
    
    if(!user) throw new NotFoundException()

      try {
        await this.usersRepository.save( user );
        return user;
        
      } catch (error) {
        this.handleDBExceptions(error);
      }
  }

  async remove(id:string){
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }


  private handleDBErrors( error: any ) {

    
    if ( error.status === 400 ) 
      throw new BadRequestException( error.response.message );

    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Please check server logs');

  }

  private handleDBExceptions( error: any ) {

    if ( error.code === '23505' )
      throw new BadRequestException(error.detail);
    
    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(error)
    // console.log(error)
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }
}
