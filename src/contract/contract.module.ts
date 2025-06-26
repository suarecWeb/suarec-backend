import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { Contract, ContractBid } from './entities/contract.entity';
import { Publication } from '../publication/entities/publication.entity';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractBid, Publication, User]),
  ],
  controllers: [ContractController],
  providers: [ContractService, EmailService],
  exports: [ContractService],
})
export class ContractModule {} 