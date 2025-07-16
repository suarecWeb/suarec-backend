import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("reference")
export class Reference {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  name: string;

  @Column("text")
  relationship: string;

  @Column("text")
  contact: string;

  @Column("text", { nullable: true })
  comment: string;

  @ManyToOne(() => User, (user) => user.references, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
