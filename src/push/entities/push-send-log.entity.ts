import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("push_send_logs")
export class PushSendLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  provider: string;

  @Column("varchar", { length: 20, nullable: false })
  status: string;

  @Column("text", { nullable: true })
  errorCode?: string | null;

  @Column("text", { nullable: true })
  errorMessage?: string | null;

  @Column("jsonb", { nullable: true })
  payload?: any;

  @Column("text", { nullable: true })
  token?: string | null;

  @Column("int", { nullable: true })
  userId?: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
