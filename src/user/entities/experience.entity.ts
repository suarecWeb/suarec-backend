import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('experiences')
export class Experience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  title: string;

  @Column('text', { nullable: false })
  company: string;

  @Column('text', { nullable: true })
  location: string;

  @Column('date', { nullable: false })
  startDate: Date;

  @Column('date', { nullable: true })
  endDate: Date;

  @Column('boolean', { default: false })
  currentPosition: boolean;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.experiences, { onDelete: 'CASCADE' })
  user: User;
} 