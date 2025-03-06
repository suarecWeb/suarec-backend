import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './guard/auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { RolesGuard } from './guard/roles.guard';

@Global()
@Module({
  imports: [
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      imports: [
        ConfigModule,
        TypeOrmModule.forFeature([User])
      ],
      
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),

  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports:[AuthModule, AuthGuard, JwtModule]
})
export class AuthModule {}