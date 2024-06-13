import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';
import { isUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PropertyService {
  private readonly logger = new Logger('ProductsService');

  // inyectamos el repositorio en el servicio
  constructor(
    @InjectRepository(Property) 
    private readonly propertyRepository: Repository<Property>
  ){

  }
  
  // create new property - recibimos DTO
  // TO DO: Crear una Location cada vez que se agregue !!!
  async create(createPropertyDto: CreatePropertyDto) {
    try{
      const property = this.propertyRepository.create(createPropertyDto);

      await this.propertyRepository.save(property);
      
      return property;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // find all
  async findAll( ) {
    // find 
    return await this.propertyRepository.find();
  }

  // find one :  puede buscar por cualquiera de las dos propiedades
  // slug o ID
  async findOne( term: string ) {
    let property: Property;

    if ( isUUID(term) ) {
      property = await this.propertyRepository.findOneBy({ id: term });
    } else {
      // hacemos las Queries con query builder -> buscamos
      // correspondencia en la base de datos comparando slugs
      const queryBuilder = this.propertyRepository.createQueryBuilder(); 
      property = await queryBuilder
        .where('slug =:slug', {
          // parametros que le pasamos para la busqueda
          slug: term.toLowerCase(),
        }).getOne();
    }

    if ( !property ) 
      throw new NotFoundException(`Property with ${ term } not found`);

    return property;
  }

  // update
  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    // buscamos la property y la updateamos haciendo merge
    // con el spread operator
    const property = await this.propertyRepository.preload({
      id: id,
      ...updatePropertyDto
    });

    if ( !property ) throw new NotFoundException(`Property with id: ${ id } not found`);

    try {
      await this.propertyRepository.save( property );
      return property;
      
    } catch (error) {
      this.handleDBExceptions(error);
    }
   
  }

  // remove 
  async remove(id: string) {
    try {
      const property = await this.findOne( id );
      await this.propertyRepository.remove( property );
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async populateWithSeedData(property: Property[]){
    try {
      await this.propertyRepository.save(property);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // manejamos la excepciones de la base de datos
  private handleDBExceptions( error: any ) {
    if ( error.code === '23505' )
      throw new BadRequestException(error.detail);
    
    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }
}