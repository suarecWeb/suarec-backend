import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
        where: { id },
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
        where: { id },
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      // Verificar permisos: solo el propietario o admin puede editar
      if (user) {
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        const isOwner = publication.user.id === user.id;

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
        where: { id },
        relations: ["user"],
      });

      if (!publication) {
        throw new NotFoundException(`Publication with ID ${id} not found`);
      }

      // Verificar permisos: solo el propietario o admin puede eliminar
      if (user) {
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        const isOwner = publication.user.id === user.id;

        if (!isAdmin && !isOwner) {
          throw new BadRequestException(
            "You can only delete your own publications",
          );
        }
      }

      await this.publicationRepository.remove(publication);
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
