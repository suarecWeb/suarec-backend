import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Application, ApplicationStatus } from "../entities/application.entity";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { UpdateApplicationDto } from "../dto/update-application.dto";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger("ApplicationService");

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    try {
      const { userId, publicationId, message, price, priceUnit } = createApplicationDto;

      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      // Verificar que la publicación existe
      const publication = await this.publicationRepository.findOne({
        where: { id: publicationId },
        relations: ["user", "user.company", "user.employer"],
      });
      if (!publication) {
        throw new BadRequestException(
          `Publication with ID ${publicationId} not found`,
        );
      }

      // Verificar que el usuario no esté aplicando a su propia publicación
      if (publication.user.id === userId) {
        throw new BadRequestException("Cannot apply to your own publication");
      }

      // Verificar que el usuario no haya aplicado ya a esta publicación
      const existingApplication = await this.applicationRepository.findOne({
        where: {
          user: { id: userId },
          publication: { id: publicationId },
        },
      });

      if (existingApplication) {
        throw new BadRequestException(
          "User has already applied to this publication",
        );
      }

      // Crear la aplicación
      const application = this.applicationRepository.create({
        message,
        price,
        priceUnit,
        status: ApplicationStatus.PENDING,
        created_at: new Date(),
        user,
        publication,
      });

      await this.applicationRepository.save(application);

      // Retornar con las relaciones cargadas
      return this.findOne(application.id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Application>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.applicationRepository.findAndCount({
        relations: [
          "user",
          "publication",
          "publication.user",
          "publication.user.company",
          "publication.user.employer",
        ],
        skip,
        take: limit,
        order: { created_at: "DESC" },
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

  async getCompanyApplications(
    companyUserId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Application>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      // Verificar si el usuario existe
      const user = await this.userRepository.findOne({
        where: { id: companyUserId },
      });
      if (!user) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      // Obtener todas las aplicaciones para las publicaciones de esta empresa
      const queryBuilder = this.applicationRepository
        .createQueryBuilder("application")
        .leftJoinAndSelect("application.user", "user")
        .leftJoinAndSelect("application.publication", "publication")
        .leftJoinAndSelect("publication.user", "publicationUser")
        .where("publication.user.id = :companyUserId", { companyUserId })
        .orderBy("application.created_at", "DESC")
        .skip(skip)
        .take(limit);

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

  async getUserApplications(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Application>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.applicationRepository.findAndCount({
        where: { user: { id: userId } },
        relations: [
          "user",
          "publication",
          "publication.user",
          "publication.user.company",
          "publication.user.employer",
        ],
        skip,
        take: limit,
        order: { created_at: "DESC" },
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

  async getPublicationApplications(
    publicationId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Application>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.applicationRepository.findAndCount({
        where: { publication: { id: publicationId } },
        relations: [
          "user",
          "publication",
          "publication.user",
          "publication.user.company",
          "publication.user.employer",
        ],
        skip,
        take: limit,
        order: { created_at: "DESC" },
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

  async checkUserApplication(
    userId: number,
    publicationId: string,
  ): Promise<{ hasApplied: boolean; application?: Application }> {
    try {
      const application = await this.applicationRepository.findOne({
        where: {
          user: { id: userId },
          publication: { id: publicationId },
        },
        relations: [
          "user",
          "publication",
          "publication.user.company",
          "publication.user.employer",
        ],
      });

      return {
        hasApplied: !!application,
        application: application || undefined,
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<Application> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id },
        relations: [
          "user",
          "publication",
          "publication.user",
          "publication.user.company",
          "publication.user.employer",
        ],
      });

      if (!application) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }

      return application;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updateApplicationDto: UpdateApplicationDto,
  ): Promise<Application> {
    try {
      const application = await this.findOne(id);

      // Solo actualizar campos permitidos
      if (updateApplicationDto.status) {
        application.status = updateApplicationDto.status;
        application.updated_at = new Date();
      }

      if (updateApplicationDto.message !== undefined) {
        application.message = updateApplicationDto.message;
      }

      if (updateApplicationDto.price !== undefined) {
        application.price = updateApplicationDto.price;
      }

      if (updateApplicationDto.priceUnit !== undefined) {
        application.priceUnit = updateApplicationDto.priceUnit;
      }

      await this.applicationRepository.save(application);

      // Devolver la aplicación actualizada con todas las relaciones
      return this.findOne(id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const application = await this.findOne(id);

      // Solo permitir eliminar aplicaciones pendientes
      if (application.status !== ApplicationStatus.PENDING) {
        throw new BadRequestException(
          "Only pending applications can be deleted",
        );
      }

      await this.applicationRepository.remove(application);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private handleDBErrors(error: any) {
    this.logger.error(error);

    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === "23505") {
      throw new BadRequestException("Duplicate entry: " + error.detail);
    }

    if (error.code === "23503") {
      throw new BadRequestException("Referenced record not found");
    }

    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }
}
