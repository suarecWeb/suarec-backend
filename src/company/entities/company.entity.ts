import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity()
export class Company {

    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column('text',{
        nullable:false
    })
    nit:string;

    @Column('text')
    name:string;

    @Column('date')
    born_at: Date;

    @Column('date',{
        nullable:false,
        default: () => 'CURRENT_TIMESTAMP'
    })
    created_at:Date;

    @Column('text')
    email: string;

    @Column('text')
    cellphone: string;

    // Relación con el usuario administrador (para login)
    @OneToOne(() => User, (user) => user.company)
    user: User;

    // Relación con los empleados de la empresa
    @OneToMany(() => User, (user) => user.employer)
    employees: User[];
}