import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Check,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_blocks')
@Unique(['blocker_id', 'blocked_id'])
@Check(`"blocker_id" != "blocked_id"`)
export class UserBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blocker_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @Column()
  blocked_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}
