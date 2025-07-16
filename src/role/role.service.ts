import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class RoleService {
  private readonly logger = new Logger('RoleService');

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    try {
      const { permissionsIds, ...roleData } = createRoleDto;
      const role = this.roleRepository.create(roleData);
      
      if (permissionsIds) {
        const permissions = await this.permissionRepository.findByIds(permissionsIds);
        if (permissions.length !== permissionsIds.length) {
          throw new NotFoundException('Some permissions were not found');
        }
        role.permissions = permissions;
      }
      
      return await this.roleRepository.save(role);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }
    
  async update(id: number, updateRoleDto: UpdateRoleDto) {
    try {
      const { permissionsIds, ...updateData } = updateRoleDto;
      const role = await this.roleRepository.preload({ id, ...updateData });
      
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }
      
      if (permissionsIds) {
        const permissions = await this.permissionRepository.findByIds(permissionsIds);
        if (permissions.length !== permissionsIds.length) {
          throw new NotFoundException('Some permissions were not found');
        }
        role.permissions = permissions;
      }
      
      return await this.roleRepository.save(role);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOneByName(name: string) {
    try {
      const role = await this.roleRepository.findOneBy({ name });
      return role;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Role>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.roleRepository.findAndCount({
        relations: ['permissions'],
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
    try {
      const role = await this.roleRepository.findOne({ where: { id }, relations: ['permissions'] });
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }
      return role;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: number) {
    try {
      const role = await this.findOne(id);
      return await this.roleRepository.remove(role);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private handleDBErrors(error: any) {
    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}