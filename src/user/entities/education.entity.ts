import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  institution: string;

  @Column('text')
  degree: string;

  @Column('text', { nullable: true })
  fieldOfStudy: string;

  @Column('date')
  startDate: Date;

  @Column('date', { nullable: true })
  endDate: Date;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.education, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 