import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import { Comment } from "../entities/comment.entity";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { UpdateCommentDto } from "../dto/update-comment.dto";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class CommentService {
  private readonly logger = new Logger("CommentService");

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    try {
      const comment = this.commentRepository.create(createCommentDto);

      const user = await this.userRepository.findOne({
        where: { id: createCommentDto.userId },
      });
      const publication = await this.publicationRepository.findOne({
        where: { id: createCommentDto.publicationId, deleted_at: null }, // Solo publicaciones activas
      });

      if (!user) {
        throw new BadRequestException("User not found");
      }

      if (!publication) {
        throw new BadRequestException("Publication not found");
      }

      comment.user = user;
      comment.publication = publication;

      await this.commentRepository.save(comment);
      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Comment>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [comments, total] = await this.commentRepository.findAndCount({
        relations: ["publication", "user"],
        skip,
        take: limit,
        where: { deleted_at: null }, // Solo comentarios activos
      });

      // Calcular metadata para la paginación
      const totalPages = Math.ceil(total / limit);

      return {
        data: comments,
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

  async findByPublicationId(
    paginationDto: PaginationDto,
    publicationId: string,
  ): Promise<PaginationResponse<Comment>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const publication = await this.publicationRepository.findOne({
        where: { id: publicationId, deleted_at: null }, // Solo publicaciones activas
      });

      if (!publication) {
        throw new NotFoundException(
          `Publication with ID ${publicationId} not found`,
        );
      }

      const [comments, total] = await this.commentRepository.findAndCount({
        where: { publication: publication, deleted_at: null }, // Solo comentarios activos
        relations: ["publication", "user"],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
      const totalPages = Math.ceil(total / limit);

      return {
        data: comments,
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

  async findOne(id: string): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id, deleted_at: null }, // Solo comentarios activos
        relations: ["publication", "user"],
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }

      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id, deleted_at: null }, // Solo comentarios activos
        relations: ["user"],
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }

      const updatedComment = await this.commentRepository.preload({
        id,
        ...updateCommentDto,
      });

      await this.commentRepository.save(updatedComment);
      return updatedComment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id, deleted_at: null }, // Solo comentarios activos
        relations: ["user", "publication"],
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }

      // Verificar permisos: solo el autor del comentario, el dueño de la publicación o admin puede eliminar
      if (user) {
        const isAuthor = comment.user.id == user.id;
        const isPublicationOwner = comment.publication.user.id == user.id;
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");

        if (!isAuthor && !isPublicationOwner && !isAdmin) {
          throw new BadRequestException(
            "You can only delete your own comments or comments on your publications",
          );
        }
      }

      // Soft delete: marcar como eliminado en lugar de remover físicamente
      await this.commentRepository.update(id, {
        deleted_at: new Date(),
      });

      this.logger.log(`Comment ${id} soft deleted successfully`);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Restaurar comentario eliminado (solo para admins)
  async restore(id: string, user?: any): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id, deleted_at: Not(IsNull()) }, // Solo comentarios eliminados
        relations: ["user", "publication"],
      });

      if (!comment) {
        throw new NotFoundException(`Deleted comment with ID ${id} not found`);
      }

      // Verificar permisos: solo admin puede restaurar
      if (user) {
        const isAdmin = user.roles.some((role: any) => role.name === "ADMIN");
        if (!isAdmin) {
          throw new BadRequestException(
            "Only administrators can restore deleted comments",
          );
        }
      }

      // Restaurar el comentario
      await this.commentRepository.update(id, {
        deleted_at: null,
      });

      return await this.findOne(id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Obtener comentarios eliminados (solo para admins)
  async findDeleted(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Comment>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [comments, total] = await this.commentRepository.findAndCount({
        relations: ["publication", "user"],
        skip,
        take: limit,
        where: { deleted_at: Not(IsNull()) }, // Solo comentarios eliminados
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: comments,
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
