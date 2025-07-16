import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Publication } from "./publication.entity";

@Entity("publication_likes")
@Unique(["userId", "publicationId"]) // Un usuario solo puede dar un like por publicación
export class PublicationLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  publicationId: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => Publication, { onDelete: "CASCADE" })
  publication: Publication;
}
