import { IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested, IsUUID, IsDateString, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  cv_url?: string;

  @IsString()
  @IsOptional()
  profile_image?: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsString()
  @IsNotEmpty()
  cellphone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  born_at: Date;

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
  @IsUUID('all', { message: 'Employer ID must be a valid UUID' })
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

  @ValidateIf(o => o.roles?.includes('PERSON'))
  @IsString()
  @IsNotEmpty()
  cedula: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  hourly_rate?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  available_days?: string[];

  @IsString()
  @IsOptional()
  available_hours?: string;

  @IsOptional()
  is_available?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolio_images?: string[];
}

export class CreateEducationDto {
  @IsString()
  @IsNotEmpty()
  institution: string;
  
  @IsString()
  @IsNotEmpty()
  degree: string;
  
  @IsString()
  @IsOptional()
  fieldOfStudy?: string;
  
  @IsDateString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  startDate: Date;
  
  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  endDate?: Date;
  
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateReferenceDto {
  @IsString()
  name: string;
  @IsString()
  relationship: string;
  @IsString()
  contact: string;
  @IsString()
  @IsOptional()
  comment?: string;
}

export class CreateSocialLinkDto {
  @IsString()
  type: string;
  @IsString()
  url: string;
}