import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum PushPlatform {
  IOS = "ios", // eslint-disable-line no-unused-vars
  ANDROID = "android", // eslint-disable-line no-unused-vars
}

@Entity("push_tokens")
@Index(["token"], { unique: true })
@Index(["user"])
export class PushToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  token: string;

  @Column("text", { nullable: false })
  platform: PushPlatform;

  @Column("text", { nullable: true })
  deviceId?: string | null;

  @Column("text", { nullable: true })
  appVersion?: string | null;

  @Column("timestamptz", { nullable: true })
  lastSeen?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;
}
