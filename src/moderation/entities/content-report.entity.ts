import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ReportContentType } from '../../enums/report-content-type.enum';
import { ReportReason } from '../../enums/report-reason.enum';
import { ReportStatus } from '../../enums/report-status.enum';

@Entity('content_reports')
@Unique('uq_reporter_content', ['reporter_id', 'content_type', 'content_id'])
@Check(`"reporter_id" != "reported_user_id"`)
export class ContentReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reporter_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column()
  reported_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: User;

  @Column({
    type: 'enum',
    enum: ReportContentType,
  })
  content_type: ReportContentType;

  @Column({ type: 'varchar', length: 255 })
  content_id: string; // Changed to string to support UUIDs and numbers

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  reviewed_by: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;
}
