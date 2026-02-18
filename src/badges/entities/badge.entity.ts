import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum BadgeType {
  LEVEL = "LEVEL",
  ACHIEVEMENT = "ACHIEVEMENT",
}

@Entity("badges")
export class Badge {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { length: 100, unique: true })
  key: string;

  @Column("varchar", { length: 150 })
  name: string;

  @Column({ type: "enum", enum: BadgeType, default: BadgeType.LEVEL })
  type: BadgeType;

  @Column("varchar", { length: 50, nullable: true })
  level_required?: string;

  @Column("text", { nullable: true })
  description?: string;

  @Column("text", { nullable: true })
  icon?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
