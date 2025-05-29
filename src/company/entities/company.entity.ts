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

    @Column('decimal', { precision: 10, scale: 8, nullable: true })
    latitude: number;

    @Column('decimal', { precision: 11, scale: 8, nullable: true })
    longitude: number;

    @Column('text', { nullable: true })
    address: string;

    @Column('text', { nullable: true })
    city: string;

    @Column('text', { nullable: true })
    country: string;

    @OneToOne(() => User, (user) => user.company)
    user: User;
}