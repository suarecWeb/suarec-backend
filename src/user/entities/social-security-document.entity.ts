import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum SocialSecurityDocumentType {
  EPS = "eps", // eslint-disable-line no-unused-vars
  PENSION = "pension", // eslint-disable-line no-unused-vars
  ARL = "arl", // eslint-disable-line no-unused-vars
  APORTES = "aportes", // eslint-disable-line no-unused-vars
}

export enum SocialSecurityDocumentStatus {
  PENDING_UPLOAD = "pending_upload", // eslint-disable-line no-unused-vars
  PENDING = "pending", // eslint-disable-line no-unused-vars
  APPROVED = "approved", // eslint-disable-line no-unused-vars
  REJECTED = "rejected", // eslint-disable-line no-unused-vars
  DELETED = "deleted", // eslint-disable-line no-unused-vars
}

@Entity("social_security_documents")
@Index("idx_social_security_docs_user_type_current", ["user_id", "document_type"], {
  unique: true,
  where: "\"is_current\" = true AND \"deleted_at\" IS NULL",
})
export class SocialSecurityDocument {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: SocialSecurityDocumentType,
    nullable: false,
  })
  document_type: SocialSecurityDocumentType;

  @Column({
    type: "enum",
    enum: SocialSecurityDocumentStatus,
    default: SocialSecurityDocumentStatus.PENDING_UPLOAD,
  })
  status: SocialSecurityDocumentStatus;

  @Column("int", { default: 1 })
  version: number;

  @Column("boolean", { default: false })
  is_current: boolean;

  @Column("text", { nullable: false })
  bucket: string;

  @Column("text", { nullable: false })
  storage_path: string;

  @Column("text", { nullable: false })
  original_filename: string;

  @Column("text", { nullable: false, default: "application/pdf" })
  mime_type: string;

  @Column("int", { nullable: false })
  size_bytes: number;

  @Column("text", { nullable: true })
  sha256: string;

  @Column("text", { nullable: true })
  review_note: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewedBy: User;

  @Column("int", { nullable: true })
  reviewed_by: number;

  @Column("timestamp", { nullable: true })
  reviewed_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "deleted_by" })
  deletedBy: User;

  @Column("int", { nullable: true })
  deleted_by: number;

  @Column("timestamp", { nullable: true })
  deleted_at: Date;

  @Column("timestamp", { nullable: true })
  storage_delete_scheduled_at: Date;

  @Column("timestamp", { nullable: true })
  storage_deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("int", { nullable: false })
  user_id: number;
}

