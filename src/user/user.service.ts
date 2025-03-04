import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';

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

  ) {}

  async onModuleInit() {
    await this.createPermissionsAndRoles();
    await this.createAdminUser();
  }

  private async createPermissionsAndRoles() {
    try {
      const permissions = ['WRITE', 'READ', 'UPDATE', 'DELETE'];
      const rolesData = {
        PERSON: ['WRITE', 'READ', 'UPDATE'],
        BUSINESS: ['WRITE', 'READ', 'UPDATE'],
        ADMIN: ['WRITE', 'READ', 'UPDATE', 'DELETE'],
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

  private async createAdminUser() {
    try {
      const adminEmail = 'admin@example.com';

      const existingUser = await this.usersRepository.findOne({ where: { email: adminEmail } });
      if (existingUser) {
        this.logger.log('Admin user already exists.');
        return;
      }

      const adminRole = await this.roleRepository.findOne({ where: { name: 'ADMIN' }, relations: ['permissions'] });
      if (!adminRole) {
        this.logger.error('Admin role not found! Make sure roles are seeded.');
        return;
      }
      
      const adminUser = this.usersRepository.create({
        genre: 'Male',
        cellphone: '123456789',
        email: adminEmail,
        password: bcrypt.hashSync('juanvalencia', 10),
        name: 'Admin',
        created_at: new Date(),
        roles: [adminRole],
        born_at: new Date('1990-01-01'),
        cv_url: 'https://example.com/default-cv.pdf',
      });

      await this.usersRepository.save(adminUser);
      this.logger.log('Admin user created successfully.');
    } catch (error) {
      this.logger.error('Error creating admin user:', error);
    }
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, email, roles: roleNames, ...userData } = createUserDto;

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
        roles, // Asignar la lista de roles
      });

      await this.usersRepository.save(user);
      return user;

    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findByEmail(email: string) {
    const user: User = await this.usersRepository.findOne({ where: { email }, relations: ['roles'] });
    if (!user) {
      throw new NotFoundException('Email not found, please register or try again.');
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['roles', 'company'] });
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'company', 'publications', 'comments']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateDto: UpdateUserDto) {
    const { roles: roleNames, ...updateData } = updateDto;

    // Buscar los roles si están en los datos de actualización
    let roles: Role[] = [];
    if (roleNames && roleNames.length > 0) {
      for (const roleName of roleNames) {
        const role = await this.roleRepository.findOne({ where: { name: roleName } });
        if (!role) {
          throw new BadRequestException(`Role ${roleName} not found`);
        }
        roles.push(role);
      }
    }

    const user = await this.usersRepository.preload({
      id,
      ...updateData,
      roles, // Asignar la lista de roles
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    try {
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      this.handleDBExceptions(error);
    }
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
}