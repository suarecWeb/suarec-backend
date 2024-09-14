import { RolePermission } from "../../role_permission/entities/role_permission.entity";
import { User } from "../../users/entities/user.entity";
import { BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, Or, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column('text', {nullable: false})
    name:string;

    @OneToMany(() => RolePermission, (role_permission) => role_permission.role)
    role_permissions:RolePermission[];

    @OneToMany(() => User, (user) => user.role)
    users:User[];
}
