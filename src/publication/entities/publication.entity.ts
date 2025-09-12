import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Comment } from "../../comment/entities/comment.entity";
import { Application } from "../../application/entities/application.entity";
import { Contract } from "../../contract/entities/contract.entity";
import { PublicationLike } from "./publication-like.entity";

export enum PublicationType {
  // Tipos de servicios
  SERVICE = "SERVICE", // Usuario ofrece servicios (OFERTA)
  SERVICE_REQUEST = "SERVICE_REQUEST", // Usuario busca servicios (SOLICITUD)
  
  // Tipos de empleos
  JOB = "JOB", // Empresa ofrece vacante
}

@Entity()
export class Publication {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  title: string;

  @Column("text", { nullable: true })
  description?: string;

  @Column("date", { nullable: false, default: () => "CURRENT_TIMESTAMP" })
  modified_at: Date;

  @Column("timestamp", { nullable: false, default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column("timestamp", { nullable: true })
  deleted_at?: Date;

  @Column("text", { nullable: false })
  category: string;

  @Column({
    type: "enum",
    enum: PublicationType,
    default: PublicationType.SERVICE,
  })
  type: PublicationType;

  @Column("text", { nullable: true })
  image_url?: string;

  @Column("numeric", { nullable: true })
  visitors?: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column("text", { nullable: true })
  priceUnit?: string; // 'hour', 'project', 'monthly', etc.

  @Column("simple-array", { nullable: true })
  gallery_images?: string[];

  // Campos específicos para solicitudes de servicios
  @Column("text", { nullable: true })
  requirements?: string; // Requisitos del trabajo

  @Column("text", { nullable: true })
  location?: string; // Ubicación del trabajo

  @Column("text", { nullable: true })
  urgency?: string; // Urgencia: "LOW", "MEDIUM", "HIGH"

  @Column("text", { nullable: true })
  preferredSchedule?: string; // Horario preferido

  // Nuevos campos de ubicación detallada
  @Column("text", { nullable: true })
  locationType?: string; // Tipo de ubicación: 'presencial' | 'virtual'

  @Column("text", { nullable: true })
  serviceLocation?: string; // Modalidad del servicio: 'domicilio' | 'sitio'

  @Column("text", { nullable: true })
  virtualMeetingLink?: string; // Link de videollamada

  @Column("text", { nullable: true })
  propertyType?: string; // Tipo de inmueble

  @Column("text", { nullable: true })
  references?: string; // Referencias de ubicación

  @ManyToOne(() => User, (user) => user.publications)
  user: User;

  @OneToMany(() => Comment, (comment) => comment.publication)
  comments: Comment[];

  // Nueva relación para aplicaciones
  @OneToMany(() => Application, (application) => application.publication)
  applications: Application[];

  // Nueva relación para contrataciones
  @OneToMany(() => Contract, (contract) => contract.publication)
  contracts: Contract[];

  @OneToMany(() => PublicationLike, (like) => like.publication)
  likes: PublicationLike[];
}
