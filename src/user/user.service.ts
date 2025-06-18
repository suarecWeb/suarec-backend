import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async onModuleInit() {
    await this.createPermissionsAndRoles();
    await this.createInitialUsers();
  }

  private async createPermissionsAndRoles() {
    try {
      const permissions = [
        'WRITE', 
        'READ', 
        'UPDATE', 
        'DELETE',
        'MANAGE_LOCATION' // Nuevo permiso para gestionar ubicación
      ];
      
      const rolesData = {
        PERSON: ['WRITE', 'READ', 'UPDATE'],
        BUSINESS: ['WRITE', 'READ', 'UPDATE', 'MANAGE_LOCATION'], // BUSINESS puede gestionar su ubicación
        ADMIN: ['WRITE', 'READ', 'UPDATE', 'DELETE', 'MANAGE_LOCATION'], // ADMIN puede gestionar todas las ubicaciones
      };

      // 1. Crear permisos si no existen
      for (const permissionName of permissions) {
        const existingPermission = await this.permissionRepository.findOne({ where: { name: permissionName } });
        if (!existingPermission) {
          const newPermission = this.permissionRepository.create({ name: permissionName });
          await this.permissionRepository.save(newPermission);
        }
      }

      // 2. Crear roles con los permisos adecuados
      for (const [roleName, permissionNames] of Object.entries(rolesData)) {
        let role = await this.roleRepository.findOne({ where: { name: roleName }, relations: ['permissions'] });

        if (!role) {
          role = this.roleRepository.create({ name: roleName });
        }

        // Asignar permisos al rol
        const rolePermissions = await this.permissionRepository.find({
          where: permissionNames.map(name => ({ name })),
        });

        role.permissions = rolePermissions;
        await this.roleRepository.save(role);
      }

      this.logger.log('Roles and permissions created successfully.');
    } catch (error) {
      this.logger.error('Error creating roles and permissions:', error);
    }
  }

  private async createInitialUsers() {
    try {
      // Definir los datos de los usuarios iniciales
      const initialUsers = [
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123',
          genre: 'Male',
          cellphone: '1234567890',
          cv_url: 'https://example.com/admin-cv.pdf',
          born_at: new Date('1990-01-01'),
          roleName: 'ADMIN'
        },
        {
          name: 'Business User',
          email: 'business@example.com',
          password: 'business123',
          genre: 'Female',
          cellphone: '2345678901',
          cv_url: 'https://example.com/business-cv.pdf',
          born_at: new Date('1985-05-15'),
          roleName: 'BUSINESS',
          company: {
            nit: '900123456-7',
            name: 'Empresa de Prueba',
            born_at: new Date('2020-01-01'),
            email: 'empresa@example.com',
            cellphone: '+573001234567',
            // Ubicación de la Universidad Icesi en Cali
            latitude: 3.3417,
            longitude: -76.5306,
            address: 'Calle 18 #122-135',
            city: 'Cali',
            country: 'Colombia'
          }
        },
        {
          name: 'Regular Person',
          email: 'person@example.com',
          password: 'person123',
          genre: 'Male',
          cellphone: '3456789012',
          cv_url: 'https://example.com/person-cv.pdf',
          born_at: new Date('1995-10-20'),
          roleName: 'PERSON'
        },
      ];

      // Crear cada usuario si no existe ya
      for (const userData of initialUsers) {
        const { roleName, company, ...userInfo } = userData;
        
        // Verificar si el usuario ya existe por email
        const existingUser = await this.usersRepository.findOne({ 
          where: { email: userInfo.email },
          relations: ['roles', 'company']
        });
        
        if (!existingUser) {
          // Buscar el rol correspondiente
          const role = await this.roleRepository.findOne({ where: { name: roleName } });
          if (!role) {
            this.logger.warn(`Role ${roleName} not found for user ${userInfo.name}`);
            continue;
          }

          let companyEntity = null;
          // Si el usuario es BUSINESS y tiene datos de empresa, crear la empresa primero
          if (roleName === 'BUSINESS' && company) {
            companyEntity = this.companyRepository.create({
              ...company,
              created_at: new Date()
            });
            await this.companyRepository.save(companyEntity);
          }
          
          // Crear el usuario
          const user = this.usersRepository.create({
            ...userInfo,
            password: bcrypt.hashSync(userInfo.password, 10),
            created_at: new Date(),
            roles: [role],
            company: companyEntity
          });
          
          await this.usersRepository.save(user);
          this.logger.log(`User ${userInfo.name} with role ${roleName} created successfully.`);
        } else {
          this.logger.log(`User ${userInfo.email} already exists.`);
          
          // Verificar y actualizar roles si es necesario
          const hasRole = existingUser.roles.some(r => r.name === roleName);
          if (!hasRole) {
            const role = await this.roleRepository.findOne({ where: { name: roleName } });
            if (role) {
              existingUser.roles = [role]; // Asignar solo el rol necesario
              await this.usersRepository.save(existingUser);
              this.logger.log(`Updated role for user ${userInfo.email}`);
            }
          }

          // Si es BUSINESS y no tiene empresa, crear la empresa
          if (roleName === 'BUSINESS' && company && !existingUser.company) {
            const companyEntity = this.companyRepository.create({
              ...company,
              created_at: new Date()
            });
            await this.companyRepository.save(companyEntity);
            
            existingUser.company = companyEntity;
            await this.usersRepository.save(existingUser);
            this.logger.log(`Added company to existing user ${userInfo.email}`);
          }
        }
      }

      this.logger.log('Initial users created successfully.');
    } catch (error) {
      this.logger.error('Error creating initial users:', error);
      throw error; // Propagar el error para ver el stack trace completo
    }
  }

  // Actualización del método create en UserService para manejar la relación con el empleador
async create(createUserDto: CreateUserDto) {
  try {
    const { password, email, roles: roleNames, employerId, companyId, ...userData } = createUserDto;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Buscar los roles en la base de datos
    const roles = [];
    if (roleNames && roleNames.length > 0) {
      for (const roleName of roleNames) {
        const role = await this.roleRepository.findOne({ where: { name: roleName } });
        if (!role) {
          throw new BadRequestException(`Role ${roleName} not found`);
        }
        roles.push(role);
      }
    }

    const user = this.usersRepository.create({
      ...userData,
      email,
      password: bcrypt.hashSync(password, 10),
      created_at: new Date(),
      roles,
    });

    // Vincular con la empresa administrada (oneToOne)
    if (companyId) {
      const company = await this.companyRepository.findOne({ where: { id: companyId } });
      if (!company) {
        throw new BadRequestException(`Company with ID ${companyId} not found`);
      }
      user.company = company;
    }

    // Vincular con la empresa como empleador (manyToOne)
    if (employerId) {
      const employer = await this.companyRepository.findOne({ where: { id: employerId } });
      if (!employer) {
        throw new BadRequestException(`Employer company with ID ${employerId} not found`);
      }
      user.employer = employer;
    }

    await this.usersRepository.save(user);
    return user;
  } catch (error) {
    this.handleDBErrors(error);
  }
}

// Actualización del método update en UserService para manejar la relación con el empleador
async update(id: number, updateDto: UpdateUserDto) {
  const { roles: roleNames, employerId, companyId, ...updateData } = updateDto;

  // Buscar el usuario a actualizar
  const user = await this.findOne(id);
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }

  // Actualizar los campos básicos
  Object.assign(user, updateData);

  // Actualizar los roles si se proporcionan
  if (roleNames && roleNames.length > 0) {
    user.roles = [];
    for (const roleName of roleNames) {
      const role = await this.roleRepository.findOne({ where: { name: roleName } });
      if (!role) {
        throw new BadRequestException(`Role ${roleName} not found`);
      }
      user.roles.push(role);
    }
  }

  // Actualizar la empresa administrada si se proporciona
  if (companyId) {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException(`Company with ID ${companyId} not found`);
    }
    user.company = company;
  }

  // Actualizar el empleador si se proporciona
  if (employerId) {
    const employer = await this.companyRepository.findOne({ where: { id: employerId } });
    if (!employer) {
      throw new BadRequestException(`Employer company with ID ${employerId} not found`);
    }
    user.employer = employer;
  } else if (employerId === null) { // Si se envía explícitamente como null, eliminar la relación
    user.employer = null;
  }

  try {
    await this.usersRepository.save(user);
    return user;
  } catch (error) {
    this.handleDBExceptions(error);
  }
}

  async findByEmail(email: string) {
    const user: User = await this.usersRepository.findOne({ where: { email }, relations: ['roles'] });
    if (!user) {
      throw new NotFoundException('Email not found, please register or try again.');
    }
    return user;
  }

  async findAllCompanies(paginationDto: PaginationDto): Promise<PaginationResponse<User>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.usersRepository.findAndCount({
        relations: ['roles', 'company'],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<User>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.usersRepository.findAndCount({
        relations: ['roles', 'company'],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'company', 'publications', 'comments', 'experiences']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  private handleDBErrors(error: any) {
    if (error.status === 400) 
      throw new BadRequestException(error.response.message);

    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Please check server logs');
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  // Método adicional para obtener usuarios por empleador
async findByEmployer(employerId: string, paginationDto: PaginationDto): Promise<PaginationResponse<User>> {
  try {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.usersRepository.findAndCount({
      where: { employer: { id: employerId } },
      relations: ['roles', 'employer'],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    this.handleDBErrors(error);
  }
}
}