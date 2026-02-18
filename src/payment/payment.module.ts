import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentController } from "./controllers/payment.controller";
import { WebhookController } from "./controllers/webhook.controller";
import { PaymentService } from "./services/payment.service";
import { WompiService } from "./services/wompi.service";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { User } from "../user/entities/user.entity";
import { Contract } from "../contract/entities/contract.entity";
import { PlatformFeeLedger } from "../fees/platform-fee-ledger.entity";
import { ContractModule } from "../contract/contract.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, User, Contract, PlatformFeeLedger]),
    forwardRef(() => ContractModule),
    forwardRef(() => UserModule),
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, WompiService],
  exports: [PaymentService, WompiService],
})
export class PaymentModule {}
