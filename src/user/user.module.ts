import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Company } from '../company/entities/company.entity';
import { Publication } from '../publication/entities/publication.entity';
import { Comment } from '../comment/entities/comment.entity';
import { Permission } from '../permission/entities/permission.entity';
import { PermissionModule } from '../permission/permission.module';
import { CompanyModule } from '../company/company.module';
import { Application } from '../application/entities/application.entity';

@Module({
  imports: [
    // Importar TypeOrmModule para las entidades necesarias
    TypeOrmModule.forFeature([User, Role, Permission, Company, Publication, Comment, Application]),
    PermissionModule,
    
    // Importar CompanyModule con referencia circular
    forwardRef(() => CompanyModule),
    
    // Importar JwtModule para el servicio JwtService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // Clave secreta para firmar los tokens
      signOptions: { expiresIn: '1h' }, // Opciones de firma (por ejemplo, expiración del token)
    }),
  ],
  controllers: [UserController], // Registrar el controlador
  providers: [UserService], // Registrar el servicio
  exports: [UserService, TypeOrmModule], // Exportar el servicio y TypeOrmModule para su uso en otros módulos
})
export class UserModule {}