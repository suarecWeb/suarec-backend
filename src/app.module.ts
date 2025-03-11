import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { SeedModule } from './seed/seed.module';
import { CompanyModule } from './company/company.module';
import { CommentModule } from './comment/comment.module';
import { PublicationModule } from './publication/publication.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
//import { RolePermissionModule } from './role_permission/role_permission.module';
import { UserModule } from './user/user.module';

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
    UserModule,
    PublicationModule,
    RoleModule,
    PermissionModule,
    //RolePermissionModule,
    ],
  controllers: [AppController],
  providers: [
    AppService, AuthGuard
    ,{
      provide: APP_GUARD,
      useClass: AuthGuard,  // Guard global para proteger las rutas
    },
  ],
  exports: [TypeOrmModule]
})


export class AppModule  {

}
