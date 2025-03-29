import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { User } from '../../user/entities/user.entity';
import { Publication } from '../../publication/entities/publication.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class CommentService {
  private readonly logger = new Logger('CommentService');

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    try {
      const comment = this.commentRepository.create(createCommentDto);

      const user = await this.userRepository.findOne({ where: {id: createCommentDto.userId}})
      const publication = await this.publicationRepository.findOne({ where: {id: createCommentDto.publicationId} })

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!publication) {
        throw new BadRequestException('Publication not found');
      }

      comment.user = user;
      comment.publication = publication;

      await this.commentRepository.save(comment);
      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Comment>> {
    try {
      const { page, limit } = paginationDto;
      const skip = (page - 1) * limit;

      const [comments, total] = await this.commentRepository.findAndCount({
        relations: ['publication', 'user'],
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
        where: { id },
        relations: ['publication', 'user'],
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }

      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    try {
      const comment = await this.commentRepository.preload({
        id,
        ...updateCommentDto,
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }

      await this.commentRepository.save(comment);
      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const comment = await this.findOne(id);
      await this.commentRepository.remove(comment);
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