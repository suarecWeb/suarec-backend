import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { SeedModule } from './seed/seed.module';
import { CompanyModule } from './company/company.module';
import { CommentModule } from './comment/comment.module';
import { PublicationModule } from './publication/publication.module';

@Module({
  imports: [
    ConfigModule.forRoot({
    isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true, 
      autoLoadEntities: true,
      logging: true, // Puedes habilitar el logging para ver las consultas SQL

    }),

    CompanyModule,
    AuthModule,
    CommentModule,
    UsersModule,
    PublicationModule,
    //SeedModule
    ],
  controllers: [AppController],
  providers: [AppService, 
    AuthGuard],
  exports: [TypeOrmModule]
})


export class AppModule  {

}
