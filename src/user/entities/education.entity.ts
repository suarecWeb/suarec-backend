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

  @Column('date', { 
    transformer: {
      to: (value: Date) => value,
      from: (value: string | Date) => value instanceof Date ? value : new Date(value)
    }
  })
  startDate: Date;

  @Column('date', { 
    nullable: true,
    transformer: {
      to: (value: Date | null) => value,
      from: (value: string | Date | null) => value instanceof Date ? value : value ? new Date(value) : null
    }
  })
  endDate: Date;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.education, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 