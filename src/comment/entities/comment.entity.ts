import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";

@Entity()
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { nullable: false })
  description: string;

  @Column("date", { nullable: false, default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column("timestamp", { nullable: true })
  deleted_at?: Date;

  @ManyToOne(() => Publication, (publication) => publication.comments, { onDelete: "CASCADE" })
  publication: Publication;

  @ManyToOne(() => User, (user) => user.comments)
  user: User;
}
