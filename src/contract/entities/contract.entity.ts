import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Publication } from '../../publication/entities/publication.entity';

export enum ContractStatus {
  PENDING = 'pending',
  NEGOTIATING = 'negotiating',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

@Entity()
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Publication, (publication) => publication.contracts)
  publication: Publication;

  @ManyToOne(() => User, (user) => user.contractsAsClient)
  client: User; // El que quiere contratar

  @ManyToOne(() => User, (user) => user.contractsAsProvider)
  provider: User; // El que ofrece el servicio

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  initialPrice: number; // Precio inicial de la publicación

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  currentPrice: number; // Precio actual en la negociación

  @Column('text', { nullable: false })
  priceUnit: string; // 'hour', 'project', 'monthly', etc.

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING
  })
  status: ContractStatus;

  @Column('text', { nullable: true })
  clientMessage?: string; // Mensaje inicial del cliente

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContractBid, (bid) => bid.contract)
  bids: ContractBid[];
}

@Entity()
export class ContractBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, (contract) => contract.bids)
  contract: Contract;

  @ManyToOne(() => User, (user) => user.bids)
  bidder: User; // Quien hace la oferta

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column('text', { nullable: true })
  message?: string; // Mensaje con la oferta

  @Column('boolean', { default: false })
  isAccepted: boolean; // Si esta oferta fue aceptada

  @CreateDateColumn()
  createdAt: Date;
} 