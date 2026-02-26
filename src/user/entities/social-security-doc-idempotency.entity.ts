import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("social_security_doc_idempotency")
@Index("idx_ss_doc_idempotency_unique", ["user_id", "scope", "idempotency_key"], {
  unique: true,
})
export class SocialSecurityDocIdempotency {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("int", { nullable: false })
  user_id: number;

  @Column("text", { nullable: false })
  scope: string;

  @Column("text", { nullable: false })
  idempotency_key: string;

  @Column("text", { nullable: false })
  request_hash: string;

  @Column("jsonb", { nullable: false })
  response_payload: any;

  @CreateDateColumn()
  created_at: Date;
}

