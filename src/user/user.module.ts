import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { User } from "./entities/user.entity";
import { Role } from "../role/entities/role.entity";
import { Company } from "../company/entities/company.entity";
import { Publication } from "../publication/entities/publication.entity";
import { Comment } from "../comment/entities/comment.entity";
import { Permission } from "../permission/entities/permission.entity";
import { PermissionModule } from "../permission/permission.module";
import { CompanyModule } from "../company/company.module";
import { Application } from "../application/entities/application.entity";
import { Experience } from "./entities/experience.entity";
import { ExperienceService } from "./services/experience.service";
import { ExperienceController } from "./controllers/experience.controller";
import { EmailVerification } from "../email-verification/entities/email-verification.entity";
import { Notification } from "../notification/entities/notification.entity";
import { Attendance } from "../attendance/entities/attendance.entity";
import { Rating } from "../rating/entities/rating.entity";
import { WorkContract } from "../work-contract/entities/work-contract.entity";
import { Education } from "./entities/education.entity";
import { Reference } from "./entities/reference.entity";
import { SocialLink } from "./entities/social-link.entity";
import { UserGallery } from "./entities/user-gallery.entity";
import { BankInfo } from "./entities/bank-info.entity";
import { GalleryService } from "./services/gallery.service";
import { BankInfoService } from "./services/bank-info.service";
import { BankInfoController } from "./controllers/bank-info.controller";
import { WompiBanksService } from "./services/wompi-banks.service";
import { BanksController } from "./controllers/banks.controller";
import { IdPhotosService } from "./services/id-photos.service";
import { UserIdPhotos } from "./entities/user-id-photos.entity";
import { RutService } from "./services/rut.service";
import { UserRut } from "./entities/user-rut.entity";
import { BalanceTransaction } from "./entities/balance-transaction.entity";
import { BalanceService } from "./services/balance.service";
import { BalanceController } from "./controllers/balance.controller";

@Module({
  imports: [
    // Importar TypeOrmModule para las entidades necesarias
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Company,
      Publication,
      Comment,
      Application,
      Experience,
      EmailVerification,
      Notification,
      Attendance,
      Rating,
      WorkContract,
      Education,
      Reference,
      SocialLink,
      UserGallery,
      UserIdPhotos,
      UserRut,
      BankInfo,
      BalanceTransaction,
    ]),
    PermissionModule,

    // Importar CompanyModule con referencia circular
    forwardRef(() => CompanyModule),

    // Importar JwtModule para el servicio JwtService
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey", // Clave secreta para firmar los tokens
      signOptions: { expiresIn: "1h" }, // Opciones de firma (por ejemplo, expiración del token)
    }),
  ],
  controllers: [UserController, ExperienceController, BankInfoController, BanksController, BalanceController],
  providers: [UserService, ExperienceService, GalleryService, BankInfoService, WompiBanksService, IdPhotosService, RutService, BalanceService],
  exports: [UserService, ExperienceService, GalleryService, BankInfoService, WompiBanksService, TypeOrmModule, IdPhotosService, RutService, BalanceService],
})
export class UserModule {}
