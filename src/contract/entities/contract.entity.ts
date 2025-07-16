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

export enum ContractStatus {
  PENDING = "pending",
  NEGOTIATING = "negotiating",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity()
export class Contract {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Publication, (publication) => publication.contracts)
  publication: Publication;

  @ManyToOne(() => User, (user) => user.contractsAsClient)
  client: User; // El que quiere contratar

  @ManyToOne(() => User, (user) => user.contractsAsProvider)
  provider: User; // El que ofrece el servicio

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  initialPrice: number; // Precio inicial de la publicación

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  totalPrice: number; // Precio total calculado

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  currentPrice: number; // Precio actual en la negociación

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  suarecCommission: number; // Comisión del 8% calculada sobre currentPrice

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  priceWithoutCommission: number; // Precio sin la comisión del 8%

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  totalCommissionWithTax: number; // Comisión del 8% + IVA del 19%

  @Column("text", { nullable: false })
  priceUnit: string; // 'hour', 'project', 'monthly', etc.

  @Column("varchar", { length: 50, nullable: true })
  paymentMethod?: string; // Método de pago seleccionado

  @Column("text", { nullable: true })
  serviceAddress?: string; // Dirección donde se prestará el servicio

  @Column("varchar", { length: 100, nullable: true })
  propertyType?: string; // Tipo de propiedad

  @Column("varchar", { length: 100, nullable: true })
  neighborhood?: string; // Barrio o zona

  @Column("text", { nullable: true })
  locationDescription?: string; // Descripción adicional de la ubicación

  @Column({
    type: "enum",
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @Column("text", { nullable: true })
  clientMessage?: string; // Mensaje inicial del cliente

  @Column("text", { nullable: true })
  providerMessage?: string; // Mensaje del proveedor (aceptar/rechazar/responder)

  @Column("timestamp", { nullable: true })
  requestedDate?: Date; // Fecha solicitada por el cliente

  @Column("varchar", { length: 10, nullable: true })
  requestedTime?: string; // Hora solicitada por el cliente

  @Column("timestamp", { nullable: true })
  agreedDate?: Date; // Fecha acordada final

  @Column("varchar", { length: 10, nullable: true })
  agreedTime?: string; // Hora acordada final

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContractBid, (bid) => bid.contract)
  bids: ContractBid[];
}

@Entity()
export class ContractBid {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Contract, (contract) => contract.bids)
  contract: Contract;

  @ManyToOne(() => User, (user) => user.bids)
  bidder: User; // Quien hace la oferta

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column("text", { nullable: true })
  message?: string; // Mensaje con la oferta

  @Column("boolean", { default: false })
  isAccepted: boolean; // Si esta oferta fue aceptada

  @CreateDateColumn()
  createdAt: Date;
}
