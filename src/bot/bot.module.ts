import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { PublicationModule } from '../publication/publication.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [UserModule, PublicationModule, CompanyModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
