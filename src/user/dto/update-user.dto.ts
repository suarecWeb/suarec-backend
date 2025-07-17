import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsDate,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

// DTOs específicos para actualización que permiten el campo id
export class UpdateEducationDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  degree?: string;

  @IsString()
  @IsOptional()
  fieldOfStudy?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateReferenceDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateSocialLinkDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  url?: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  cv_url?: string;

  @IsString()
  @IsOptional()
  profile_image?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  @IsString()
  @IsOptional()
  cellphone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  born_at?: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  // Relación con la empresa como administrador (oneToOne)
  @IsString()
  @IsOptional()
  companyId?: string;

  // Relación con la empresa como empleado (manyToOne)
  @IsString()
  @IsOptional()
  @IsUUID("all", { message: "Employer ID must be a valid UUID" })
  employerId?: string;

  @IsString()
  @IsOptional()
  profession?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateEducationDto)
  @IsOptional()
  education?: UpdateEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReferenceDto)
  @IsOptional()
  references?: UpdateReferenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSocialLinkDto)
  @IsOptional()
  socialLinks?: UpdateSocialLinkDto[];

  @IsString()
  @IsOptional()
  bio?: string;

  @ValidateIf((o) => o.roles?.includes("PERSON"))
  @IsString()
  @IsOptional()
  cedula?: string;
}
