import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../user/entities/user.entity";
import { Contract } from "../contract/entities/contract.entity";

export enum PlatformFeeStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}

@Entity("platform_fee_ledger")
export class PlatformFeeLedger {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  provider: User;

  @ManyToOne(() => Contract, { onDelete: "CASCADE" })
  contract: Contract;

  @Column("decimal", { precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({
    type: "enum",
    enum: PlatformFeeStatus,
    default: PlatformFeeStatus.PENDING,
  })
  status: PlatformFeeStatus;

  @Column("timestamp", { nullable: true })
  due_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
