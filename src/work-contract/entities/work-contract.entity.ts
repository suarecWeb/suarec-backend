// src/work-contract/entities/work-contract.entity.ts
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { Rating } from "../../rating/entities/rating.entity";

export enum ContractStatus {
  PENDING = "PENDING", // eslint-disable-line no-unused-vars
  ACCEPTED = "ACCEPTED", // eslint-disable-line no-unused-vars
  IN_PROGRESS = "IN_PROGRESS", // eslint-disable-line no-unused-vars
  COMPLETED = "COMPLETED", // eslint-disable-line no-unused-vars
  CANCELLED = "CANCELLED", // eslint-disable-line no-unused-vars
  DISPUTED = "DISPUTED", // eslint-disable-line no-unused-vars
}

export enum ContractType {
  SERVICE = "SERVICE", // eslint-disable-line no-unused-vars
  EMPLOYMENT = "EMPLOYMENT", // eslint-disable-line no-unused-vars
}

@Entity("work_contracts")
export class WorkContract {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  agreed_price: number;

  @Column("text", { nullable: true })
  currency: string; // 'COP', 'USD', etc.

  @Column({
    type: "enum",
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @Column({
    type: "enum",
    enum: ContractType,
    nullable: false,
  })
  type: ContractType;

  @Column("date", { nullable: true })
  start_date: Date;

  @Column("date", { nullable: true })
  end_date: Date;

  @Column("date", { nullable: true })
  estimated_completion: Date;

  @Column("text", { nullable: true })
  location: string;

  @Column("simple-array", { nullable: true })
  images: string[]; // URLs de imágenes del trabajo

  @Column("text", { nullable: true })
  client_notes: string; // Notas del cliente

  @Column("text", { nullable: true })
  provider_notes: string; // Notas del proveedor

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Cliente que contrata
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  client: User;

  // Proveedor del servicio o empleado
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  provider: User;

  // Publicación relacionada (opcional)
  @ManyToOne(() => Publication, { nullable: true })
  publication: Publication;

  // Calificaciones asociadas
  @OneToMany(() => Rating, (rating) => rating.workContract)
  ratings: Rating[];
}
