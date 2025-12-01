// src/user/entities/user.entity.ts (ACTUALIZADO)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Role } from "../../role/entities/role.entity";
import { Company } from "../../company/entities/company.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { Comment } from "../../comment/entities/comment.entity";
import { Message } from "../../message/entities/message.entity";
import { Application } from "../../application/entities/application.entity";
import { Attendance } from "../../attendance/entities/attendance.entity";
import { Rating } from "../../rating/entities/rating.entity";
import { WorkContract } from "../../work-contract/entities/work-contract.entity";
import { EmailVerification } from "../../email-verification/entities/email-verification.entity";
import { Experience } from "./experience.entity";
import { Education } from "./education.entity";
import { Reference } from "./reference.entity";
import { SocialLink } from "./social-link.entity";
import { Contract, ContractBid } from "../../contract/entities/contract.entity";
import { UserGallery } from "./user-gallery.entity";
import { UserIdPhotos } from "./user-id-photos.entity";
import { CompanyHistory } from "../../company/entities/company-history.entity";
import { BankInfo } from "./bank-info.entity";
import { UserPlan } from "../enums/user-plan.enum";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false })
  name: string;

  @Column("text", { nullable: false })
  password: string;

  @Column("text", { nullable: true })
  cv_url: string;

  @Column("text", { nullable: false })
  genre: string;

  @Column("text", { nullable: false })
  cellphone: string;

  @Column("text", { nullable: false })
  email: string;

  @Column("date", {
    nullable: false,
    transformer: {
      to: (value: Date) => value,
      from: (value: string | Date) =>
        value instanceof Date ? value : new Date(value),
    },
  })
  born_at: Date;

  @Column("date", {
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
    transformer: {
      to: (value: Date) => value,
      from: (value: string | Date) =>
        value instanceof Date ? value : new Date(value),
    },
  })
  created_at: Date;

  // Nuevos campos para verificación de email
  @Column("boolean", { default: false })
  email_verified: boolean;

  @Column("timestamp", { nullable: true })
  email_verified_at: Date;

  // Campos adicionales para personas
  @Column("text", { nullable: true })
  profession: string;

  @Column("simple-array", { nullable: true })
  skills: string[];

  // Ubicación del usuario
  @Column("text", { nullable: true })
  location: string;

  @Column("decimal", { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column("decimal", { precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Información de perfil adicional
  @Column("text", { nullable: true })
  bio: string;

  @Column("text", { nullable: true })
  profile_image: string;

  @Column("simple-array", { nullable: true })
  portfolio_images: string[];

  // Configuraciones de disponibilidad
  @Column("simple-array", { nullable: true })
  available_days: string[]; // ['monday', 'tuesday', etc.]

  @Column("text", { nullable: true })
  available_hours: string; // '09:00-18:00'

  @Column("boolean", { default: true })
  is_available: boolean;

  // Tarifas por hora (para servicios)
  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  hourly_rate: number;

  @Column("text", { nullable: true })
  currency: string;

  // Estadísticas calculadas
  @Column("decimal", { precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column("int", { default: 0 })
  total_ratings: number;

  @Column("int", { default: 0 })
  completed_jobs: number;

  @Column("boolean", { default: true })
  is_active: boolean;

  @Column("timestamp", { nullable: true })
  last_seen: Date;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "roles_users_users",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles: Role[];

  @OneToOne(() => Company, (company) => company.user)
  @JoinColumn()
  company: Company;

  @ManyToOne(() => Company, (company) => company.employees)
  employer: Company;

  @OneToMany(() => Publication, (publication) => publication.user)
  publications: Publication[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, (message) => message.recipient)
  receivedMessages: Message[];

  @OneToMany(() => Application, (application) => application.user)
  applications: Application[];

  @Column("date", { nullable: true })
  employmentStartDate: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.employee)
  attendances: Attendance[];

  // Nuevas relaciones para el sistema de calificaciones
  @OneToMany(() => Rating, (rating) => rating.reviewer)
  givenRatings: Rating[];

  @OneToMany(() => Rating, (rating) => rating.reviewee)
  receivedRatings: Rating[];

  // Relaciones para contratos de trabajo
  @OneToMany(() => WorkContract, (contract) => contract.client)
  contractsAsClient: WorkContract[];

  @OneToMany(() => WorkContract, (contract) => contract.provider)
  contractsAsProvider: WorkContract[];

  @OneToMany(() => Experience, (experience) => experience.user)
  experiences: Experience[];

  // Verificaciones de email
  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => Education, (education) => education.user, { cascade: true })
  education: Education[];

  @OneToMany(() => Reference, (reference) => reference.user, { cascade: true })
  references: Reference[];

  @OneToMany(() => SocialLink, (socialLink) => socialLink.user, {
    cascade: true,
  })
  socialLinks: SocialLink[];

  @Column("boolean", { default: false })
  isVerify: boolean;

  @Column({
    type: "enum",
    enum: UserPlan,
    default: UserPlan.FREE
  })
  plan: UserPlan;

  // Fecha de expiración del plan (para futura funcionalidad)
  @Column("timestamp", { nullable: true })
  planExpiresAt: Date;

  // Relaciones para contrataciones y subastas
  @OneToMany(() => Contract, (contract) => contract.client)
  serviceContractsAsClient: Contract[];

  @OneToMany(() => Contract, (contract) => contract.provider)
  serviceContractsAsProvider: Contract[];

  @OneToMany(() => ContractBid, (bid) => bid.bidder)
  bids: ContractBid[];

  @OneToMany(() => UserGallery, (gallery) => gallery.user, { cascade: true })
  gallery: UserGallery[];

  @OneToMany(() => UserIdPhotos, (idPhoto) => idPhoto.user, { cascade: true })
  idPhotos: UserIdPhotos[];

  @OneToMany(() => CompanyHistory, (history) => history.user)
  companyHistory: CompanyHistory[];

  @OneToOne(() => BankInfo, (bankInfo) => bankInfo.user, { cascade: true })
  bankInfo: BankInfo;

  @Column("text", { nullable: true, unique: true })
  cedula: string;

  // Saldo a favor (por proveer servicios) - No se puede usar para cancelar deudas
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  credit_balance: number;

  // Saldo en contra (por recibir servicios) - Se cancela solo con pagos reales
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  debit_balance: number;

  // Terms and Conditions acceptance (required for Apple App Store compliance)
  @Column("boolean", { default: false })
  has_accepted_terms: boolean;

  @Column("timestamp", { nullable: true })
  terms_accepted_at: Date;

  @Column("text", { nullable: true, default: '1.0' })
  terms_version: string;
}
