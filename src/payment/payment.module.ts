import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controllers/payment.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PaymentService } from './services/payment.service';
import { WompiService } from './services/wompi.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { User } from '../user/entities/user.entity';
import { Contract } from '../contract/entities/contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, User, Contract]),
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, WompiService],
  exports: [PaymentService, WompiService],
})
export class PaymentModule {} 