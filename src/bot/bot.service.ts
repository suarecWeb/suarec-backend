import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PublicationService } from '../publication/services/publication.service';
import { CompanyService } from '../company/services/company.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreatePublicationDto } from '../publication/dto/create-publication.dto';
import { CreateCompanyDto } from '../company/dto/create-company.dto';

@Injectable()
export class BotService {
  constructor(
    private readonly userService: UserService,
    private readonly publicationService: PublicationService,
    private readonly companyService: CompanyService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  async findUser(email?: string, cellphone?: string) {
    try {
      if (email) {
        return await this.userService.findByEmail(email);
      }
      if (cellphone) {
        return await this.userService.findByCellphone(cellphone);
      }
      return null;
    } catch (error) {
      // Si no encuentra el usuario, retorna null en lugar de lanzar excepción
      return null;
    }
  }

  async createPublication(createPublicationDto: CreatePublicationDto) {
    return this.publicationService.create(createPublicationDto);
  }

  async createCompany(createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  async getOrCreateBotUser() {
    const botEmail = 'bot@suarec.com';
    let botUser = await this.userService.findByEmail(botEmail);
    
    if (!botUser) {
      const botUserData: CreateUserDto = {
        name: 'Suarec Bot',
        email: botEmail,
        password: 'bot_password_' + Date.now(),
        cellphone: '+573000000000',
        genre: 'OTHER',
        born_at: new Date(),
        roles: ['BOT'],
        bio: 'Bot automático de Suarec para crear publicaciones desde WhatsApp',
        cedula: 'BOT001'
      };
      
      botUser = await this.userService.create(botUserData);
    }
    
    return botUser;
  }
}
