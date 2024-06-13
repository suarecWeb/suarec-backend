import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { forwardRef } from '@nestjs/common';


@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
  imports: [ forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}