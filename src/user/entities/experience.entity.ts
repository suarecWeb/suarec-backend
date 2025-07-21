import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("experiences")
export class Experience {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  title: string;

  @Column("text", { nullable: false })
  company: string;

  @Column("text", { nullable: true })
  location: string;

  @Column("date", {
    nullable: false,
    transformer: {
      to: (value: Date) => value,
      from: (value: string | Date) =>
        value instanceof Date ? value : new Date(value),
    },
  })
  startDate: Date;

  @Column("date", {
    nullable: true,
    transformer: {
      to: (value: Date | null) => value,
      from: (value: string | Date | null) =>
        value instanceof Date ? value : value ? new Date(value) : null,
    },
  })
  endDate: Date;

  @Column("boolean", { default: false })
  currentPosition: boolean;

  @Column("text", { nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.experiences, { onDelete: "CASCADE" })
  user: User;
}
