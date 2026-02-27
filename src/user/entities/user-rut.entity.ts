import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("user_rut")
export class UserRut {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false })
  file_url: string;

  @Column("text", { nullable: false })
  file_path: string;

  @Column("text", { nullable: true })
  description: string;

  @Column("enum", {
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  })
  status: "pending" | "approved" | "rejected";

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.rutDocuments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("int", { nullable: false })
  user_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewedBy: User;

  @Column("int", { nullable: true })
  reviewed_by: number;
}
