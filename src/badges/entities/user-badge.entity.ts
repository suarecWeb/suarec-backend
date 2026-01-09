import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Badge } from "./badge.entity";
import { User } from "../../user/entities/user.entity";

@Entity("user_badges")
@Unique("uq_user_badges_user_badge", ["user", "badge"])
export class UserBadge {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Badge, { onDelete: "CASCADE" })
  @JoinColumn({ name: "badgeId" })
  badge: Badge;

  @CreateDateColumn({ name: "awarded_at" })
  awarded_at: Date;
}
