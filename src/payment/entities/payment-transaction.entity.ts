import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Contract } from '../../contract/entities/contract.entity';
import { PaymentMethod, PaymentStatus, WompiPaymentType } from '../../enums/paymentMethod.enum';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column('text', { nullable: false })
  currency: string; // 'COP', 'USD', etc.

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: false,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: WompiPaymentType,
    nullable: true,
  })
  wompi_payment_type?: WompiPaymentType;

  // Wompi specific fields
  @Column('text', { nullable: true })
  wompi_transaction_id?: string;

  @Column('text', { nullable: true })
  wompi_acceptance_token?: string;

  @Column('text', { nullable: true })
  wompi_payment_link?: string;

  @Column('json', { nullable: true })
  wompi_response?: any; // Store full Wompi response

  @Column('text', { nullable: true })
  error_message?: string;

  @Column('text', { nullable: true })
  reference?: string; // Custom reference for the transaction

  @Column('text', { nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  payer: User; // User making the payment

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  payee: User; // User receiving the payment

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  contract: Contract; // Associated work contract
} 