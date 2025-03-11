import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Comment } from '../../comment/entities/comment.entity';

@Entity()
export class Publication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('date', { nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  modified_at: Date;

  @Column('date', { nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column('text', { nullable: false })
  category: string;

  @Column('text', { nullable: true })
  image_url?: string;

  @Column('numeric', { nullable: true })
  visitors?: number;

  @ManyToOne(() => User, (user) => user.publications)
  user: User;

  @OneToMany(() => Comment, (comment) => comment.publication)
  comments: Comment[];
}
