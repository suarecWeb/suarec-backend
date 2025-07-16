import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Comment } from "../../comment/entities/comment.entity";
import { Application } from "../../application/entities/application.entity";
import { Contract } from "../../contract/entities/contract.entity";
import { PublicationLike } from "./publication-like.entity";

@Entity()
export class Publication {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  title: string;

  @Column("text", { nullable: true })
  description?: string;

  @Column("date", { nullable: false, default: () => "CURRENT_TIMESTAMP" })
  modified_at: Date;

  @Column("timestamp", { nullable: false, default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column("text", { nullable: false })
  category: string;

  @Column("text", { nullable: true })
  image_url?: string;

  @Column("numeric", { nullable: true })
  visitors?: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column("text", { nullable: true })
  priceUnit?: string; // 'hour', 'project', 'monthly', etc.

  @Column("simple-array", { nullable: true })
  gallery_images?: string[];

  @ManyToOne(() => User, (user) => user.publications)
  user: User;

  @OneToMany(() => Comment, (comment) => comment.publication)
  comments: Comment[];

  // Nueva relación para aplicaciones
  @OneToMany(() => Application, (application) => application.publication)
  applications: Application[];

  // Nueva relación para contrataciones
  @OneToMany(() => Contract, (contract) => contract.publication)
  contracts: Contract[];

  // Relación para likes
  @OneToMany(() => PublicationLike, (like) => like.publication)
  likes: PublicationLike[];
}
