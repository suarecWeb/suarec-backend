import { BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, Or, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "../../role/entities/role.entity";
import { Company } from "../../company/entities/company.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { Comment } from "../../comment/entities/comment.entity";

@Entity()
export class User {

    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column('text',{
        nullable:false
    })
    name:string;

    @Column('text',{
        nullable:false
    })
    password:string;

    @Column('text')
    cv_url: string;

    @Column('text',{
        nullable:false
    })
    genre:string;

    @Column('text',{
        nullable:false
    })
    cellphone:string;

    @Column('text',{
        nullable:false
    })
    email:string;

    @Column('date',{
        nullable:false})
    born_at:Date;

    @Column('date',{
        nullable:false,
        default: () => 'CURRENT_TIMESTAMP'
    })
    created_at:Date;

    @ManyToOne(() => Role, (role) => role.users)
    role:Role;

    @OneToOne(() => Company, (company) => company.user)
    company: Company;

    @OneToMany(() => Publication, (publication) => publication.user)
    publications: Publication[];

    @OneToMany(() => Comment, (comment) => comment.user)
    comments: Comment[];
}
