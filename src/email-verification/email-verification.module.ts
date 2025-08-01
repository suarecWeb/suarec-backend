// src/email-verification/email-verification.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailVerificationService } from "./services/email-verification.service";
import { EmailVerificationController } from "./email-verification.controller";
import { EmailVerification } from "./entities/email-verification.entity";
import { User } from "../user/entities/user.entity";
import { WorkContract } from "../work-contract/entities/work-contract.entity";
import { Publication } from "../publication/entities/publication.entity";

@Module({
  imports: [
    // Importar TypeOrmModule para las entidades necesarias
    TypeOrmModule.forFeature([EmailVerification, User, WorkContract, Publication]),
  ],
  controllers: [EmailVerificationController], // Registrar el controlador
  providers: [EmailVerificationService], // Registrar el servicio
  exports: [EmailVerificationService, TypeOrmModule], // Exportar el servicio y TypeOrmModule para su uso en otros módulos
})
export class EmailVerificationModule {}
