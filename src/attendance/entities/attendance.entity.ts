import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity("attendance")
export class Attendance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.attendances)
  employee: User;

  @Column({ type: "date" })
  date: Date;

  @Column({ type: "time" })
  checkInTime: string;

  @Column({ type: "boolean", default: false })
  isLate: boolean;

  @Column({ type: "boolean", default: false })
  isAbsent: boolean;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
