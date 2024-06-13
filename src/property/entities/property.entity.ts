import { PropertyType } from '../../enums/propertyType.enum';
import { Role } from "src/enums/role.enum";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Property')
// clase Property
export class Property {
    // primary key auto generada - tipo de auto gen
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        nullable: false,   
    })
    type: string;

    @Column('text', {
        nullable: false,
    })
    country: string;

    @Column('text', {
        nullable: false,
    })
    city: string;

    @Column('text', {
        nullable: false,
    })
    address: string;

    @Column('numeric', {
        nullable: false,   
    })
    latitude: number;

    @Column('numeric', {
        nullable: false,   
    })
    altitude: number;
    
    @Column('numeric', {
        nullable: false,   
    })
    rooms: number;
    
    @Column('numeric', {
        nullable: false,   
    })
    bathrooms: number;
    
    @Column('numeric', {
        nullable: false,   
    })
    area: number;
    
    @Column('numeric', {
        nullable: false,   
    })
    cost_per_night: number; // costo por noche
    
    @Column('numeric', {
        nullable: false,   
    })
    max_people: number; // max gente que puede alojar

    // El SLUG LO QUE HACE ES "CAMUFLAR" U OCULTAR METADATOS DE LOS DATOS COMO POR EJEMPLO EL ID EN LA URL !!!!
    // ARMAMOS UNA EQUIVALENCIA, UN MAPEO CON EL SLUG (palabra o palabras camufladas) CON EL ENDPOINT REAL
    @Column('text', 
            {unique: true})
    slug: string; 

    // before insert hacemos un refactor
    // al slug
    @BeforeInsert()
    checkSlug(): void {
        const addressConv: string = this.address.replace(/\s+/g, '-')
        const addressConv2: string = addressConv.replace('#', '-')

        if (!this.slug) {
            this.slug = `${this.country}-${this.city}-${addressConv2}`;
        }

        this.slug = this.slug.toLowerCase();
    }
}
