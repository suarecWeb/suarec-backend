// src/rating/services/rating.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../entities/rating.entity';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { User } from '../../user/entities/user.entity';
import { WorkContract } from '../../work-contract/entities/work-contract.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class RatingService {
  private readonly logger = new Logger('RatingService');

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkContract)
    private readonly workContractRepository: Repository<WorkContract>,
  ) {}

  async create(createRatingDto: CreateRatingDto): Promise<Rating> {
    try {
      const { reviewerId, revieweeId, workContractId, stars, comment, category } = createRatingDto;

      // Validar que las estrellas estén entre 1 y 5
      if (stars < 1 || stars > 5) {
        throw new BadRequestException('Stars must be between 1 and 5');
      }

      // Verificar que el reviewer existe
      const reviewer = await this.userRepository.findOne({ where: { id: reviewerId } });
      if (!reviewer) {
        throw new BadRequestException(`Reviewer with ID ${reviewerId} not found`);
      }

      // Verificar que el reviewee existe
      const reviewee = await this.userRepository.findOne({ where: { id: revieweeId } });
      if (!reviewee) {
        throw new BadRequestException(`Reviewee with ID ${revieweeId} not found`);
      }

      // Verificar que no se esté calificando a sí mismo
      if (reviewerId === revieweeId) {
        throw new BadRequestException('Cannot rate yourself');
      }

      let workContract = null;
      if (workContractId) {
        workContract = await this.workContractRepository.findOne({ 
          where: { id: workContractId },
          relations: ['client', 'provider']
        });
        
        if (!workContract) {
          throw new BadRequestException(`Work contract with ID ${workContractId} not found`);
        }

        // Verificar que el reviewer sea parte del contrato
        if (workContract.client.id !== reviewerId && workContract.provider.id !== reviewerId) {
          throw new BadRequestException('Only participants in the contract can rate');
        }

        // Verificar que no haya calificado ya este contrato
        const existingRating = await this.ratingRepository.findOne({
          where: {
            reviewer: { id: reviewerId },
            workContract: { id: workContractId }
          }
        });

        if (existingRating) {
          throw new BadRequestException('You have already rated this work contract');
        }
      }

      // Crear la calificación
      const rating = this.ratingRepository.create({
        stars,
        comment,
        category,
        reviewer,
        reviewee,
        workContract,
      });

      await this.ratingRepository.save(rating);
      
      // Retornar con las relaciones cargadas
      return this.findOne(rating.id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Rating>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.ratingRepository.findAndCount({
        relations: ['reviewer', 'reviewee', 'workContract'],
        skip,
        take: limit,
        order: { created_at: 'DESC' },
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

  async findByUser(userId: number, paginationDto: PaginationDto): Promise<PaginationResponse<Rating>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.ratingRepository.findAndCount({
        where: { reviewee: { id: userId } },
        relations: ['reviewer', 'reviewee', 'workContract'],
        skip,
        take: limit,
        order: { created_at: 'DESC' },
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

  async getUserRatingStats(userId: number): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { [key: number]: number };
    categoryStats: { [category: string]: { average: number; count: number } };
  }> {
    try {
      const ratings = await this.ratingRepository.find({
        where: { reviewee: { id: userId } },
        relations: ['reviewer'],
      });

      if (ratings.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          categoryStats: {},
        };
      }

      // Calcular promedio
      const totalStars = ratings.reduce((sum, rating) => sum + rating.stars, 0);
      const averageRating = totalStars / ratings.length;

      // Distribución de calificaciones
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(rating => {
        ratingDistribution[rating.stars]++;
      });

      // Estadísticas por categoría
      const categoryStats: { [category: string]: { average: number; count: number } } = {};
      const categoryCounts: { [category: string]: { total: number; count: number } } = {};

      ratings.forEach(rating => {
        if (!categoryCounts[rating.category]) {
          categoryCounts[rating.category] = { total: 0, count: 0 };
        }
        categoryCounts[rating.category].total += rating.stars;
        categoryCounts[rating.category].count++;
      });

      Object.keys(categoryCounts).forEach(category => {
        const { total, count } = categoryCounts[category];
        categoryStats[category] = {
          average: total / count,
          count,
        };
      });

      return {
        averageRating: Math.round(averageRating * 100) / 100,
        totalRatings: ratings.length,
        ratingDistribution,
        categoryStats,
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<Rating> {
    try {
      const rating = await this.ratingRepository.findOne({
        where: { id },
        relations: ['reviewer', 'reviewee', 'workContract'],
      });

      if (!rating) {
        throw new NotFoundException(`Rating with ID ${id} not found`);
      }

      return rating;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(id: string, updateRatingDto: UpdateRatingDto): Promise<Rating> {
    try {
      const rating = await this.findOne(id);

      if (updateRatingDto.stars && (updateRatingDto.stars < 1 || updateRatingDto.stars > 5)) {
        throw new BadRequestException('Stars must be between 1 and 5');
      }

      Object.assign(rating, updateRatingDto);
      await this.ratingRepository.save(rating);
      
      return rating;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const rating = await this.findOne(id);
      await this.ratingRepository.remove(rating);
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

    if (error.code === '23505') {
      throw new BadRequestException('Duplicate entry: ' + error.detail);
    }

    if (error.code === '23503') {
      throw new BadRequestException('Referenced record not found');
    }

    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}