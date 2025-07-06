import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_gallery')
export class UserGallery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: false })
  image_url: string;

  @Column('text', { nullable: false })
  image_path: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('int', { default: 0 })
  order_index: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.gallery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('int', { nullable: false })
  user_id: number;
} 