// src/rating/entities/rating.entity.ts
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { WorkContract } from '../../work-contract/entities/work-contract.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int', { nullable: false })
  stars: number; // 1-5 estrellas

  @Column('text', { nullable: true })
  comment: string;

  @Column('text', { nullable: false })
  category: string; // 'SERVICE' | 'EMPLOYER' - para calificar como proveedor de servicio o como empleador

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Usuario que da la calificación
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reviewer: User;

  // Usuario que recibe la calificación
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reviewee: User;

  // Contrato de trabajo asociado (opcional)
  @ManyToOne(() => WorkContract, (contract) => contract.ratings, { nullable: true })
  workContract: WorkContract;
}