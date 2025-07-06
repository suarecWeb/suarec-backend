import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationLike } from '../entities/publication-like.entity';
import { Publication } from '../entities/publication.entity';
import { CreatePublicationLikeDto } from '../dto/create-publication-like.dto';

@Injectable()
export class PublicationLikeService {
  constructor(
    @InjectRepository(PublicationLike)
    private publicationLikeRepository: Repository<PublicationLike>,
    @InjectRepository(Publication)
    private publicationRepository: Repository<Publication>,
  ) {}

  // Dar like a una publicación
  async likePublication(createLikeDto: CreatePublicationLikeDto): Promise<PublicationLike> {
    // Verificar que la publicación existe
    const publication = await this.publicationRepository.findOne({
      where: { id: createLikeDto.publicationId }
    });

    if (!publication) {
      throw new NotFoundException('Publicación no encontrada');
    }

    // Verificar si el usuario ya dio like
    const existingLike = await this.publicationLikeRepository.findOne({
      where: {
        userId: createLikeDto.userId,
        publicationId: createLikeDto.publicationId
      }
    });

    if (existingLike) {
      throw new ConflictException('El usuario ya dio like a esta publicación');
    }

    // Crear el like
    const like = this.publicationLikeRepository.create({
      userId: createLikeDto.userId,
      publicationId: createLikeDto.publicationId
    });

    return await this.publicationLikeRepository.save(like);
  }

  // Quitar like de una publicación
  async unlikePublication(userId: number, publicationId: string): Promise<void> {
    const like = await this.publicationLikeRepository.findOne({
      where: {
        userId,
        publicationId
      }
    });

    if (!like) {
      throw new NotFoundException('Like no encontrado');
    }

    await this.publicationLikeRepository.remove(like);
  }

  // Obtener likes de una publicación
  async getPublicationLikes(publicationId: string): Promise<PublicationLike[]> {
    return await this.publicationLikeRepository.find({
      where: { publicationId },
      relations: ['user']
    });
  }

  // Contar likes de una publicación
  async getPublicationLikesCount(publicationId: string): Promise<number> {
    return await this.publicationLikeRepository.count({
      where: { publicationId }
    });
  }

  // Verificar si un usuario dio like a una publicación
  async hasUserLiked(userId: number, publicationId: string): Promise<boolean> {
    const like = await this.publicationLikeRepository.findOne({
      where: {
        userId,
        publicationId
      }
    });

    return !!like;
  }

  // Obtener likes de un usuario
  async getUserLikes(userId: number): Promise<PublicationLike[]> {
    return await this.publicationLikeRepository.find({
      where: { userId },
      relations: ['publication']
    });
  }
} 