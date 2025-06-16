// src/work-contract/work-contract.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkContractService } from './services/work-contract.service';
import { WorkContractController } from './work-contract.controller';
import { WorkContract } from './entities/work-contract.entity';
import { User } from '../user/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';

@Module({
  imports: [
    // Importar TypeOrmModule para las entidades necesarias
    TypeOrmModule.forFeature([WorkContract, User, Publication]),
  ],
  controllers: [WorkContractController], // Registrar el controlador
  providers: [WorkContractService], // Registrar el servicio
  exports: [WorkContractService, TypeOrmModule], // Exportar el servicio y TypeOrmModule para su uso en otros módulos
})
export class WorkContractModule {}