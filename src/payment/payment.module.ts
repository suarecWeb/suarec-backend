import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { WompiService } from './services/wompi.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { User } from '../user/entities/user.entity';
import { WorkContract } from '../work-contract/entities/work-contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, User, WorkContract]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, WompiService],
  exports: [PaymentService, WompiService],
})
export class PaymentModule {} 