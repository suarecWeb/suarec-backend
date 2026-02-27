import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PushSendLog } from "./entities/push-send-log.entity";
import { PushToken } from "./entities/push-token.entity";
import { PushController } from "./push.controller";
import { PushService } from "./push.service";

@Module({
  imports: [TypeOrmModule.forFeature([PushToken, PushSendLog])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
