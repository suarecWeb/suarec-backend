import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToOne, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Company } from '../../company/entities/company.entity';
import { Publication } from '../../publication/entities/publication.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { Message } from '../../message/entities/message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id:number;

  @Column('text',{
      nullable:false
  })
  name:string;

  @Column('text',{
      nullable:false
  })
  password:string;

  @Column('text', {nullable: true})
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

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({ 
    name: 'roles_users_users', 
    joinColumn: { name: 'user_id', referencedColumnName: 'id' }, 
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' } 
  })
  roles: Role[];

  @OneToOne(() => Company, (company) => company.user)
  @JoinColumn() // Esto indica que User tendrá la columna que se usa para la relación
  company: Company;

  // Relación con la empresa donde trabaja como empleado
  @ManyToOne(() => Company, (company) => company.employees)
  employer: Company;

  @OneToMany(() => Publication, (publication) => publication.user)
  publications: Publication[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  // Relaciones para mensajes
  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, (message) => message.recipient)
  receivedMessages: Message[];
}