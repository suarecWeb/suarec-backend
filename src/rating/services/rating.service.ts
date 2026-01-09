// src/rating/services/rating.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Rating } from "../entities/rating.entity";
import { CreateRatingDto } from "../dto/create-rating.dto";
import { UpdateRatingDto } from "../dto/update-rating.dto";
import { User } from "../../user/entities/user.entity";
import { WorkContract } from "../../work-contract/entities/work-contract.entity";
import { Contract, ContractStatus } from "../../contract/entities/contract.entity";
import { PaymentTransaction } from "../../payment/entities/payment-transaction.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import { PROCESSED_PAYMENT_STATUSES } from "../../levels/level.rules";

@Injectable()
export class RatingService {
  private readonly logger = new Logger("RatingService");

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(WorkContract)
    private readonly workContractRepository: Repository<WorkContract>, // eslint-disable-line no-unused-vars
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>, // eslint-disable-line no-unused-vars
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>, // eslint-disable-line no-unused-vars
  ) {}

  async create(createRatingDto: CreateRatingDto): Promise<Rating> {
    try {
      const { reviewerId, revieweeId, stars, comment, category, contractId } =
        createRatingDto;

      // Validar que las estrellas estén entre 1 y 5
      if (stars < 1 || stars > 5) {
        throw new BadRequestException("Stars must be between 1 and 5");
      }

      // Verificar que el reviewer existe
      const reviewer = await this.userRepository.findOne({
        where: { id: reviewerId },
      });
      if (!reviewer) {
        throw new BadRequestException(
          `Reviewer with ID ${reviewerId} not found`,
        );
      }

      // Verificar que el reviewee existe
      const reviewee = await this.userRepository.findOne({
        where: { id: revieweeId },
      });
      if (!reviewee) {
        throw new BadRequestException(
          `Reviewee with ID ${revieweeId} not found`,
        );
      }

      // Verificar que no se esté calificando a sí mismo
      if (reviewerId === revieweeId) {
        throw new BadRequestException("Cannot rate yourself");
      }

      const contract = await this.contractRepository.findOne({
        where: { id: contractId },
        relations: ["client", "provider"],
      });
      if (!contract) {
        throw new BadRequestException(
          `Contract with ID ${contractId} not found`,
        );
      }

      if (contract.status !== ContractStatus.COMPLETED) {
        throw new BadRequestException(
          "The contract must be completed before rating",
        );
      }

      const reviewerIsClient = contract.client.id === reviewerId;
      const reviewerIsProvider = contract.provider.id === reviewerId;

      if (!reviewerIsClient && !reviewerIsProvider) {
        throw new BadRequestException(
          "Reviewer is not a participant of this contract",
        );
      }

      const expectedRevieweeId = reviewerIsClient
        ? contract.provider.id
        : contract.client.id;

      if (revieweeId !== expectedRevieweeId) {
        throw new BadRequestException(
          "Reviewee does not match the other contract participant",
        );
      }

      const hasProcessedPayment =
        await this.paymentTransactionRepository.findOne({
          where: {
            contract: { id: contractId },
            status: In(PROCESSED_PAYMENT_STATUSES),
          },
        });

      if (!hasProcessedPayment) {
        throw new BadRequestException(
          "Contract is not ready for rating without a processed payment",
        );
      }

      // Verificar que no haya calificado ya este contrato
      const existingRating = await this.ratingRepository.findOne({
        where: {
          contract: { id: contractId },
          reviewer: { id: reviewerId },
        },
      });

      if (existingRating) {
        throw new BadRequestException(
          "You have already rated this contract",
        );
      }

      // Crear la calificación (sin workContract por ahora)
      const rating = this.ratingRepository.create({
        stars,
        comment,
        category,
        reviewer,
        reviewee,
        contract,
      });

      const savedRating = await this.ratingRepository.save(rating);

      // Retornar con las relaciones cargadas
      return this.findOne(savedRating.id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Rating>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.ratingRepository.findAndCount({
        relations: ["reviewer", "reviewee", "contract", "workContract"],
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

  async findByUser(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Rating>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.ratingRepository.findAndCount({
        where: { reviewee: { id: userId } },
        relations: ["reviewer", "reviewee", "contract", "workContract"],
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

  async getUserRatingStats(userId: number): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { [key: number]: number };
    categoryStats: { [category: string]: { average: number; count: number } };
  }> {
    try {
      const ratings = await this.ratingRepository.find({
        where: { reviewee: { id: userId } },
        relations: ["reviewer"],
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
      ratings.forEach((rating) => {
        ratingDistribution[rating.stars]++;
      });

      // Estadísticas por categoría
      const categoryStats: {
        [category: string]: { average: number; count: number };
      } = {};
      const categoryCounts: {
        [category: string]: { total: number; count: number };
      } = {};

      ratings.forEach((rating) => {
        if (!categoryCounts[rating.category]) {
          categoryCounts[rating.category] = { total: 0, count: 0 };
        }
        categoryCounts[rating.category].total += rating.stars;
        categoryCounts[rating.category].count++;
      });

      Object.keys(categoryCounts).forEach((category) => {
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
        relations: ["reviewer", "reviewee", "contract", "workContract"],
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

      if (
        updateRatingDto.stars &&
        (updateRatingDto.stars < 1 || updateRatingDto.stars > 5)
      ) {
        throw new BadRequestException("Stars must be between 1 and 5");
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

  async getContractsReadyForRating(userId: number): Promise<any[]> {
    try {
      console.log(`🔍 Buscando contratos listos para calificar para usuario: ${userId}`); // eslint-disable-line no-console
      
      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.log(`❌ Usuario ${userId} no encontrado`); // eslint-disable-line no-console
        return [];
      }
      
      // Buscar contratos donde el usuario es el CLIENTE y hay pagos completados
      // Solo los clientes pueden calificar a los proveedores después del pago
      console.log(`📊 Buscando contratos donde usuario ${userId} es cliente...`); // eslint-disable-line no-console
      const contracts = await this.contractRepository
        .createQueryBuilder("contract")
        .leftJoinAndSelect("contract.client", "client")
        .leftJoinAndSelect("contract.provider", "provider")
        .leftJoinAndSelect("contract.publication", "publication")
        .where("contract.client.id = :userId", { userId }) // SOLO contratos donde el usuario es cliente
        .andWhere("contract.status = :status", { status: ContractStatus.COMPLETED }) // Estado correcto usando enum
        .getMany();

      console.log(`📋 Contratos con status 'completed' encontrados: ${contracts.length}`); // eslint-disable-line no-console

      // Filtrar contratos que tengan pagos completados
      const contractsWithCompletedPayments = [];

      for (const contract of contracts) {
        try {
          console.log(`💳 Verificando pagos para contrato: ${contract.id}`); // eslint-disable-line no-console
          // Buscar pagos completados para este contrato
          const completedPayments = await this.contractRepository.manager.query(
            `
            SELECT COUNT(*) as count 
            FROM payment_transactions 
            WHERE "contractId" = $1 AND status IN ('COMPLETED', 'FINISHED')
          `,
            [contract.id],
          );

          if (completedPayments[0] && parseInt(completedPayments[0].count) > 0) {
            contractsWithCompletedPayments.push(contract);
          }
        } catch (paymentError) {
          console.error(`❌ Error verificando pagos para contrato ${contract.id}:`, paymentError); // eslint-disable-line no-console
          // Continuar con el siguiente contrato en caso de error
        }
      }

      console.log(`💳 Contratos con pagos completados: ${contractsWithCompletedPayments.length}`); // eslint-disable-line no-console

      const contractsWithRatingStatus = await Promise.all(
        contractsWithCompletedPayments.map(async (contract) => {
          try {
            // El cliente califica al proveedor
            const providerId = contract.provider.id;
            console.log(`⭐ Verificando rating existente - Cliente: ${userId}, Proveedor: ${providerId}`); // eslint-disable-line no-console
            
            const existingRating = await this.ratingRepository.findOne({
              where: {
                contract: { id: contract.id },
                reviewer: { id: userId }, // Cliente como reviewer
              },
            });

            console.log(`📝 Rating existente para contrato ${contract.id}: ${existingRating ? 'SÍ' : 'NO'}`); // eslint-disable-line no-console

            return {
              contractId: contract.id,
              contractTitle: contract.publication?.title || "Sin título",
              otherUser: {
                id: contract.provider.id,
                name: contract.provider.name,
                profile_image: contract.provider.profile_image,
              },
              userRole: "CLIENT", // Siempre será CLIENT ya que filtramos por client.id
              canRate: !existingRating,
              alreadyRated: !!existingRating,
              completedAt: contract.completedAt || contract.updatedAt,
              ratingCategory: "SERVICE", // Cliente califica el servicio del proveedor
            };
          } catch (ratingError) {
            console.error(`❌ Error procesando contrato ${contract.id}:`, ratingError); // eslint-disable-line no-console
            return null; // Devolver null para filtrar después
          }
        }),
      );

      // Filtrar contratos nulos (errores)
      const validContracts = contractsWithRatingStatus.filter(contract => contract !== null);

      const finalContracts = validContracts.filter(
        (contract) => contract.canRate,
      );
      
      console.log(`⭐ Contratos finales listos para calificar: ${finalContracts.length}`); // eslint-disable-line no-console
      console.log('📝 Contratos detalle:', finalContracts.map(c => ({ // eslint-disable-line no-console
        contractId: c.contractId,
        title: c.contractTitle,
        providerName: c.otherUser.name,
        canRate: c.canRate
      })));
      
      return finalContracts;
    } catch (error) {
      console.error('❌ Error completo en getContractsReadyForRating:', error); // eslint-disable-line no-console
      this.logger.error('Error in getContractsReadyForRating:', error);
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
