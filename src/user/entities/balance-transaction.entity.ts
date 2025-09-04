import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Contract } from "../../contract/entities/contract.entity";
import { PaymentTransaction } from "../../payment/entities/payment-transaction.entity";

export enum BalanceTransactionType {
  OTP_VERIFICATION_DEBIT = "otp_verification_debit", // eslint-disable-line no-unused-vars
  OTP_VERIFICATION_CREDIT = "otp_verification_credit", // eslint-disable-line no-unused-vars
  PAYMENT_COMPLETED_CREDIT = "payment_completed_credit", // eslint-disable-line no-unused-vars
}

export enum BalanceTransactionStatus {
  PENDING = "pending", // eslint-disable-line no-unused-vars
  COMPLETED = "completed", // eslint-disable-line no-unused-vars
  CANCELLED = "cancelled", // eslint-disable-line no-unused-vars
}

@Entity("balance_transactions")
export class BalanceTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  amount: number; 

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  balanceBefore: number; 

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  balanceAfter: number;

  @Column({
    type: "enum",
    enum: BalanceTransactionType,
    nullable: false,
  })
  type: BalanceTransactionType;

  @Column({
    type: "enum",
    enum: BalanceTransactionStatus,
    default: BalanceTransactionStatus.COMPLETED,
  })
  status: BalanceTransactionStatus;

  @Column("text", { nullable: true })
  description?: string;

  @Column("text", { nullable: true })
  reference?: string; 

  @ManyToOne(() => Contract, { nullable: true, onDelete: "SET NULL" })
  contract?: Contract;

  @ManyToOne(() => PaymentTransaction, { nullable: true, onDelete: "SET NULL" })
  paymentTransaction?: PaymentTransaction;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
