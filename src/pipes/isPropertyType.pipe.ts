// property-type-validation.pipe.ts
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { PropertyType } from '../enums/propertyType.enum';
import { Injectable } from '@nestjs/common';

// Pipe propia para verificar el ENUM en las Property
@Injectable()
export class IsPropertyType implements PipeTransform {
  transform(value: any): any {
    value = value.toUpperCase(); // Convertir el valor a mayúsculas para comparar
    
    if (!(value in PropertyType)) {
      throw new BadRequestException(`"${value}" is not a valid property type`);
    }
    
    return value;
  }
}
