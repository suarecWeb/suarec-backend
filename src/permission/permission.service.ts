import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { Permission } from "./entities/permission.entity";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";

@Injectable()
export class PermissionService {
  private readonly logger = new Logger("PermissionService");

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>, // eslint-disable-line no-unused-vars
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    try {
      const permission = this.permissionRepository.create(createPermissionDto);
      return await this.permissionRepository.save(permission);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Permission>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.permissionRepository.findAndCount({
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
      const permission = await this.permissionRepository.findOne({
        where: { id },
      });
      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }
      return permission;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto) {
    try {
      const permission = await this.permissionRepository.preload({
        id,
        ...updatePermissionDto,
      });
      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }
      return await this.permissionRepository.save(permission);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: number) {
    try {
      const permission = await this.findOne(id);
      return await this.permissionRepository.remove(permission);
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

    if (error.code === "23505") {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }
}
