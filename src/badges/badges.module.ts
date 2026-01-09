import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BadgesController } from "./badges.controller";
import { BadgesService } from "./badges.service";
import { Badge } from "./entities/badge.entity";
import { UserBadge } from "./entities/user-badge.entity";
import { LevelsModule } from "../levels/levels.module";

@Module({
  imports: [TypeOrmModule.forFeature([Badge, UserBadge]), LevelsModule],
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
