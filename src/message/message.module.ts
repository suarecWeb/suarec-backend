import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageService } from "./message.service";
import { MessageController } from "./message.controller";
import { MessageGateway } from "./message.gateway";
import { Message } from "./entities/message.entity";
import { User } from "../user/entities/user.entity";
import { AuthModule } from "../auth/auth.module";
import { PushModule } from "../push/push.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    AuthModule, // Importar AuthModule para tener acceso al JwtModule configurado
    PushModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}
