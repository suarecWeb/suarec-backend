// src/rating/rating.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RatingService } from "./services/rating.service";
import { RatingController } from "./rating.controller";
import { Rating } from "./entities/rating.entity";
import { User } from "../user/entities/user.entity";
import { WorkContract } from "../work-contract/entities/work-contract.entity";
import { Contract } from "../contract/entities/contract.entity";

@Module({
  imports: [
    // Importar TypeOrmModule para las entidades necesarias
    TypeOrmModule.forFeature([Rating, User, WorkContract, Contract]),
  ],
  controllers: [RatingController], // Registrar el controlador
  providers: [RatingService], // Registrar el servicio
  exports: [RatingService, TypeOrmModule], // Exportar el servicio y TypeOrmModule para su uso en otros módulos
})
export class RatingModule {}
