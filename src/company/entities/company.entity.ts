import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { CompanyGallery } from "./company-gallery.entity";
import { CompanyHistory } from "./company-history.entity";

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

    @Column('time', { nullable: true, default: '07:00' })
    checkInTime: string;

    // Relación con el usuario administrador (para login)
    @OneToOne(() => User, (user) => user.company)
    user: User;

    // Relación con los empleados de la empresa
    @OneToMany(() => User, (user) => user.employer)
    employees: User[];

    // Relación con la galería de fotos de la empresa
    @OneToMany(() => CompanyGallery, (gallery) => gallery.company, { cascade: true })
    gallery: CompanyGallery[];

    // Relación con el historial de empleados
    @OneToMany(() => CompanyHistory, (history) => history.company)
    companyHistory: CompanyHistory[];
}