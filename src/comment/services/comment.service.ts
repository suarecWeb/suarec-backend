import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger('CommentService');

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    try {
      const comment = this.commentRepository.create(createCommentDto);
      await this.commentRepository.save(comment);
      return comment;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(): Promise<Comment[]> {
    try {
      const comments = await this.commentRepository.find({ relations: ['publication', 'user'] });
      return comments;
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
