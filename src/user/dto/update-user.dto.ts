import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto, CreateEducationDto, CreateReferenceDto, CreateSocialLinkDto } from './create-user.dto';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  profession?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  @IsOptional()
  education?: CreateEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceDto)
  @IsOptional()
  references?: CreateReferenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSocialLinkDto)
  @IsOptional()
  socialLinks?: CreateSocialLinkDto[];

  @IsString()
  @IsOptional()
  bio?: string;
}
