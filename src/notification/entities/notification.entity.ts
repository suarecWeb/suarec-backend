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
  NEW_MESSAGE = "NEW_MESSAGE", // eslint-disable-line no-unused-vars
  APPLICATION_STATUS = "APPLICATION_STATUS", // eslint-disable-line no-unused-vars
  CONTRACT_UPDATE = "CONTRACT_UPDATE", // eslint-disable-line no-unused-vars
  NEW_RATING = "NEW_RATING", // eslint-disable-line no-unused-vars
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED", // eslint-disable-line no-unused-vars
  WORK_REMINDER = "WORK_REMINDER", // eslint-disable-line no-unused-vars
  SYSTEM_UPDATE = "SYSTEM_UPDATE", // eslint-disable-line no-unused-vars
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
