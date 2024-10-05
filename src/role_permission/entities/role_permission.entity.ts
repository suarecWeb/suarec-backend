import { Permission } from "../../permission/entities/permission.entity";
import { Role } from "../../role/entities/role.entity";
import { BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, Or, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class RolePermission {
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @ManyToOne(() => Role, (role) => role.role_permissions)
    role:Role;
    
    @ManyToOne(() => Permission, (permission) => permission.role_permissions)
    permission:Permission;
}