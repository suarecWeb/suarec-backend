import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';
import { IsOptional, IsString } from 'class-validator';

// hereda de CreateProperty, por tanto tiene todos sus atributos
// podemos modificar algunos
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
    @IsString()
    @IsOptional()
    readonly id: string;
}