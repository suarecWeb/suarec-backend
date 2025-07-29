import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import { Publication } from "../entities/publication.entity";
import { CreatePublicationDto } from "../dto/create-publication.dto";
import { UpdatePublicationDto } from "../dto/update-publication.dto";
import { User } from "../../user/entities/user.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class PublicationService {
  private readonly logger = new Logger("PublicationService");

  constructor(
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
  ) {}

  async create(
    createPublicationDto: CreatePublicationDto,
  ): Promise<Publication> {
    try {
      const publication =
        this.publicationRepository.create(createPublicationDto);
      const user = await this.userRepository.findOne({
        where: { id: createPublicationDto.userId },
        relations: ["company", "employer"],
      });

      if (!user) {
        throw new BadRequestException("User not found");
      }

      publication.user = user;
      await this.publicationRepository.save(publication);

      return publication;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.publicationRepository.findAndCount({
        skip,
        take: limit,
        relations: ["user", "user.company", "user.employer"],
        where: { deleted_at: null }, // Solo publicaciones no eliminadas
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

  async findOne(id: string): Promise<Publication> {
    try {
      const publication = await this.publicationRepository.findOne({
        where: { id, deleted_at: null }, // Solo publicaciones no eliminadas
        relations: [
          "user",
          "comments",
          "comments.user",
          "user.company",
          "user.employer",
        ],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      return publication;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updatePublicationDto: UpdatePublicationDto,
    user?: any,
  ): Promise<Publication> {
    try {
      const publication = await this.publicationRepository.findOne({
        where: { id, deleted_at: null }, // Solo publicaciones no eliminadas
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      // Verificar permisos: solo el propietario o admin puede editar
      if (user) {
        this.logger.log(`User attempting to edit: ${JSON.stringify(user)}`);
        this.logger.log(`Publication owner ID: ${publication.user.id} (type: ${typeof publication.user.id})`);
        this.logger.log(`User ID: ${user.id} (type: ${typeof user.id})`);
        
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        const isOwner = Number(publication.user.id) === Number(user.id);
        
        this.logger.log(`Is Admin: ${isAdmin}`);
        this.logger.log(`Is Owner: ${isOwner}`);
        this.logger.log(`User roles: ${JSON.stringify(user.roles)}`);

        if (!isAdmin && !isOwner) {
          throw new BadRequestException(
            "You can only edit your own publications",
          );
        }
      }

      // Establecer modified_at automáticamente
      const updateData = {
        ...updatePublicationDto,
        modified_at: new Date(),
      };

      const updatedPublication = await this.publicationRepository.preload({
        id,
        ...updateData,
      });

      await this.publicationRepository.save(updatedPublication);
      return updatedPublication;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    try {
      const publication = await this.publicationRepository.findOne({
        where: { id, deleted_at: null }, // Solo publicaciones no eliminadas
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      // Verificar permisos: solo el propietario o admin puede eliminar
      if (user) {
        this.logger.log(`User attempting to delete: ${JSON.stringify(user)}`);
        this.logger.log(`Publication owner ID: ${publication.user.id} (type: ${typeof publication.user.id})`);
        this.logger.log(`User ID: ${user.id} (type: ${typeof user.id})`);
        
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        const isOwner = Number(publication.user.id) === Number(user.id);
        
        this.logger.log(`Is Admin: ${isAdmin}`);
        this.logger.log(`Is Owner: ${isOwner}`);
        this.logger.log(`User roles: ${JSON.stringify(user.roles)}`);

        if (!isAdmin && !isOwner) {
          throw new BadRequestException(
            "You can only delete your own publications",
          );
        }
      }

      // Soft delete: marcar como eliminada en lugar de remover físicamente
      await this.publicationRepository.update(id, {
        deleted_at: new Date(),
      });

      this.logger.log(`Publication ${id} soft deleted successfully`);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Método para restaurar una publicación eliminada (solo para admins)
  async restore(id: string, user?: any): Promise<Publication> {
    try {
      const publication = await this.publicationRepository.findOne({
        where: { id, deleted_at: Not(IsNull()) }, // Solo publicaciones eliminadas
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Deleted publication with ID ${id} not found`);
      }

      // Verificar permisos: solo admin puede restaurar
      if (user) {
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        if (!isAdmin) {
          throw new BadRequestException(
            "Only administrators can restore deleted publications",
          );
        }
      }

      // Restaurar la publicación
      await this.publicationRepository.update(id, {
        deleted_at: null,
      });

      return await this.findOne(id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Método para obtener publicaciones eliminadas (solo para admins)
  async findDeleted(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.publicationRepository.findAndCount({
        skip,
        take: limit,
        relations: ["user", "user.company", "user.employer"],
        where: { deleted_at: Not(IsNull()) }, // Solo publicaciones eliminadas
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
