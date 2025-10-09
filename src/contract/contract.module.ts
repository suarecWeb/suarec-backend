import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContractController } from "./contract.controller";
import { ContractService } from "./contract.service";
import { Contract, ContractBid, ContractOTP } from "./entities/contract.entity";
import { Publication } from "../publication/entities/publication.entity";
import { User } from "../user/entities/user.entity";
import { EmailService } from "../email/email.service";
import { PaymentModule } from "../payment/payment.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractBid, ContractOTP, Publication, User]),
    forwardRef(() => PaymentModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ContractController],
  providers: [ContractService, EmailService],
  exports: [ContractService],
})
export class ContractModule {}
