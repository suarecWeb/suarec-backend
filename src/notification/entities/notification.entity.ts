// src/notification/entities/notification.entity.ts
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum NotificationType {
  NEW_MESSAGE = "NEW_MESSAGE",
  APPLICATION_STATUS = "APPLICATION_STATUS",
  CONTRACT_UPDATE = "CONTRACT_UPDATE",
  NEW_RATING = "NEW_RATING",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  WORK_REMINDER = "WORK_REMINDER",
  SYSTEM_UPDATE = "SYSTEM_UPDATE",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  title: string;

  @Column("text", { nullable: false })
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    nullable: false,
  })
  type: NotificationType;

  @Column("boolean", { default: false })
  read: boolean;

  @Column("text", { nullable: true })
  action_url: string; // URL para redirigir cuando se hace clic

  @Column("simple-json", { nullable: true })
  metadata: any; // Datos adicionales específicos del tipo de notificación

  @CreateDateColumn()
  created_at: Date;

  // Usuario que recibe la notificación
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;
}
