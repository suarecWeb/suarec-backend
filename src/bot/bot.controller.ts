import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { BotService } from './bot.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreatePublicationDto } from '../publication/dto/create-publication.dto';
import { CreateCompanyDto } from '../company/dto/create-company.dto';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Public()
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.botService.createUser(createUserDto);
  }

  @Public()
  @Get('users')
  async findUser(@Query('email') email?: string, @Query('cellphone') cellphone?: string) {
    return this.botService.findUser(email, cellphone);
  }

  @Public()
  @Post('publications')
  async createPublication(@Body() createPublicationDto: CreatePublicationDto) {
    return this.botService.createPublication(createPublicationDto);
  }

  @Public()
  @Post('companies')
  async createCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.botService.createCompany(createCompanyDto);
  }

  @Public()
  @Get('bot-user')
  async getOrCreateBotUser() {
    return this.botService.getOrCreateBotUser();
  }
}
