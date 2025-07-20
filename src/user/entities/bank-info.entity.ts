import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum DocumentType {
  CC = "CC", // Cédula de Ciudadanía
  NIT = "NIT", // Número de Identificación Tributaria
  CE = "CE", // Cédula de Extranjería
  TI = "TI", // Tarjeta de Identidad
  PAS = "PAS", // Pasaporte
}

export enum AccountType {
  AHORROS = "AHORROS",
  CORRIENTE = "CORRIENTE",
}

@Entity("bank_info")
export class BankInfo {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { length: 255 })
  accountHolderName: string; // Nombre completo del titular

  @Column({
    type: "enum",
    enum: DocumentType,
  })
  documentType: DocumentType; // Tipo de documento

  @Column("varchar", { length: 50 })
  documentNumber: string; // Número de documento

  @Column("varchar", { length: 100 })
  bankName: string; // Nombre del banco

  @Column({
    type: "enum",
    enum: AccountType,
  })
  accountType: AccountType; // Tipo de cuenta

  @Column("varchar", { length: 50 })
  accountNumber: string; // Número de cuenta

  @Column("varchar", { length: 255 })
  contactEmail: string; // Email para confirmaciones

  @Column("varchar", { length: 20 })
  contactPhone: string; // Teléfono para confirmaciones

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relación uno a uno con User
  @OneToOne(() => User, (user) => user.bankInfo, { onDelete: "CASCADE" })
  @JoinColumn()
  user: User;
}
