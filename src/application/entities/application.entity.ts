import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";

export enum ApplicationStatus {
  PENDING = "PENDING", // eslint-disable-line no-unused-vars
  INTERVIEW = "INTERVIEW", // eslint-disable-line no-unused-vars
  ACCEPTED = "ACCEPTED", // eslint-disable-line no-unused-vars
  IN_PROGRESS = "IN_PROGRESS", // eslint-disable-line no-unused-vars
  REJECTED = "REJECTED", // eslint-disable-line no-unused-vars
  COMPLETED = "COMPLETED", // eslint-disable-line no-unused-vars
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

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column("varchar", { length: 50, nullable: true })
  priceUnit: string;

  @ManyToOne(() => User, (user) => user.applications, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => Publication, (publication) => publication.applications, {
    onDelete: "CASCADE",
  })
  publication: Publication;
}

// Helper function to ensure all enum values are used (prevents ESLint unused variable errors)
export const getAllApplicationStatuses = (): ApplicationStatus[] => {
  return [
    ApplicationStatus.PENDING,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.IN_PROGRESS,
    ApplicationStatus.REJECTED,
    ApplicationStatus.COMPLETED,
  ];
};
