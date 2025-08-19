import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  content: string;

  @Column("boolean", { default: false })
  read: boolean;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  sent_at: Date;

  @Column("timestamp", { nullable: true })
  read_at: Date;

  @Column("varchar", { length: 20, default: "open" })
  status: string; // "open", "closed", "resolved", "message"

  @Column("varchar", { length: 255, nullable: true })
  ticket_id: string;

  @ManyToOne(() => User, (user) => user.sentMessages)
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedMessages)
  recipient: User;
}
