import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_gallery')
export class CompanyGallery {
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

  @ManyToOne(() => Company, (company) => company.gallery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column('uuid', { nullable: false })
  company_id: string;
} 