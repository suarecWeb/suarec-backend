import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";

export enum ApplicationStatus {
  PENDING = "PENDING",
  INTERVIEW = "INTERVIEW",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

@Entity("applications")
export class Application {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column("timestamp", { nullable: true })
  updated_at: Date;

  @Column("text", { nullable: true })
  message: string;

  @ManyToOne(() => User, (user) => user.applications, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => Publication, (publication) => publication.applications, {
    onDelete: "CASCADE",
  })
  publication: Publication;
}
