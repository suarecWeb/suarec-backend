import { RolePermission } from "../../role_permission/entities/role_permission.entity";
import { BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, Or, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column('text', {nullable: false, unique: true })
    name:string;

    @OneToMany(() => RolePermission, (role_permission) => role_permission.permission)
    role_permissions:RolePermission[];
}
