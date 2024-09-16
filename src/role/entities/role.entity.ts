import { RolePermission } from "../../role_permission/entities/role_permission.entity";
import { User } from "../../users/entities/user.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RolePermission, (role_permission) => role_permission.role)
  role_permissions: RolePermission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}