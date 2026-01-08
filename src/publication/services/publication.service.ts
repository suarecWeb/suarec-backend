import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not, Like, Between, In } from "typeorm";
import { Publication, PublicationType } from "../entities/publication.entity";
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

      if (!user.isVerify) {
        throw new ForbiddenException('User must be verified to create publications');
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
      const { 
        page = 1, 
        limit = 5, 
        type, 
        category, 
        categories, 
        search, 
        minPrice, 
        maxPrice, 
        sortBy = 'created_at', 
        sortOrder = 'DESC' 
      } = paginationDto;
      const skip = (page - 1) * limit;

      // Siempre usar query builder para mayor flexibilidad y consistencia
      const queryBuilder = this.publicationRepository
        .createQueryBuilder('publication')
        .leftJoinAndSelect('publication.user', 'user')
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('user.employer', 'employer')
        .where('publication.deleted_at IS NULL');

      // Aplicar filtros
      if (type) {
        queryBuilder.andWhere('publication.type = :type', { type });
      }

      if (category) {
        queryBuilder.andWhere('LOWER(publication.category) = :category', {
          category: category.toLowerCase(),
        });
      }

      if (categories && categories.length > 0) {
        const normalizedCategories = categories.map((item) => item.toLowerCase());
        queryBuilder.andWhere('LOWER(publication.category) IN (:...categories)', {
          categories: normalizedCategories,
        });
      }

      // Filtro por rango de precios (mejorado)
      if (minPrice !== undefined || maxPrice !== undefined) {
        if (minPrice !== undefined && maxPrice !== undefined) {
          queryBuilder.andWhere('publication.price BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice });
        } else if (minPrice !== undefined) {
          queryBuilder.andWhere('publication.price >= :minPrice AND publication.price IS NOT NULL', { minPrice });
        } else if (maxPrice !== undefined) {
          queryBuilder.andWhere('publication.price <= :maxPrice AND publication.price IS NOT NULL', { maxPrice });
        }
      }

      // Búsqueda en título o descripción (mejorado)
      if (search) {
        queryBuilder.andWhere(
          '(publication.title ILIKE :search OR publication.description ILIKE :search OR publication.category ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Ordenamiento (mejorado con validación)
      const validSortFields = ['created_at', 'modified_at', 'price', 'visitors', 'title'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      queryBuilder.orderBy(`publication.${sortField}`, sortOrder);

      // Paginación
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

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

  async findServiceOffers(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.findAll({ ...paginationDto, type: PublicationType.SERVICE });
  }

  async findServiceRequests(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.findAll({ ...paginationDto, type: PublicationType.SERVICE_REQUEST });
  }

  async findOne(id: string): Promise<Publication> {
    try {
      const publication = await this.publicationRepository.findOne({
        where: { id, deleted_at: IsNull() }, // Solo publicaciones no eliminadas
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
        where: { id, deleted_at: IsNull() }, // Solo publicaciones no eliminadas
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      // Verificar si el usuario puede editar esta publicación
      if (user && publication.user.id !== user.id && !user.roles?.some((role: any) => role.name === "ADMIN")) {
        throw new BadRequestException("You can only edit your own publications");
      }

      // Actualizar la publicación
      Object.assign(publication, updatePublicationDto);
      return await this.publicationRepository.save(publication);
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
      const { page = 1, limit = 5 } = paginationDto;
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

  // Método para obtener categorías únicas disponibles
  async getAvailableCategories(): Promise<string[]> {
    try {
      // Categorías predefinidas que siempre deben estar disponibles
      const predefinedCategories = [
        "Tecnología",
        "Construcción", 
        "Salud",
        "Educación",
        "Servicios",
        "Gastronomía",
        "Transporte",
        "Manufactura",
        "Finanzas",
        "Agricultura",
        "Otro"
      ];

      // Obtener categorías únicas de la base de datos
      const dbCategories = await this.publicationRepository
        .createQueryBuilder('publication')
        .select('DISTINCT publication.category', 'category')
        .where('publication.deleted_at IS NULL')
        .andWhere('publication.category IS NOT NULL')
        .andWhere('publication.category != :empty', { empty: '' })
        .orderBy('publication.category', 'ASC')
        .getRawMany();

      const dbCategoryList = dbCategories.map(item => item.category);
      
      // Combinar categorías predefinidas con las de la BD, eliminando duplicados
      const allCategories = [...new Set([...predefinedCategories, ...dbCategoryList])];
      
      return allCategories.sort();
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Método para obtener tipos de publicaciones disponibles
  async getAvailableTypes(): Promise<PublicationType[]> {
    try {
      // Devolver todos los tipos posibles del enum, no solo los que existen en la BD
      return Object.values(PublicationType);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private handleDBErrors(error: any) {
    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof HttpException) {
      throw error;
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
