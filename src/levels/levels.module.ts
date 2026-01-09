import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contract } from "../contract/entities/contract.entity";
import { User } from "../user/entities/user.entity";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

@Module({
  imports: [TypeOrmModule.forFeature([Contract, User])],
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
