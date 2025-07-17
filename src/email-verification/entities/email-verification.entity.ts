// src/email-verification/entities/email-verification.entity.ts
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity("email_verifications")
export class EmailVerification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  token: string;

  @Column("text", { nullable: false })
  email: string;

  @Column("boolean", { default: false })
  verified: boolean;

  @Column("timestamp", { nullable: false })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;
}
