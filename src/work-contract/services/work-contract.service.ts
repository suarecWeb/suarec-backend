// src/work-contract/services/work-contract.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkContract, ContractStatus } from "../entities/work-contract.entity";
import { CreateWorkContractDto } from "../dto/create-work-contract.dto";
import { UpdateWorkContractDto } from "../dto/update-work-contract.dto";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class WorkContractService {
  private readonly logger = new Logger("WorkContractService");

  constructor(
    @InjectRepository(WorkContract)
    private readonly workContractRepository: Repository<WorkContract>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
  ) {}

  async create(
    createWorkContractDto: CreateWorkContractDto,
  ): Promise<WorkContract> {
    try {
      const { clientId, providerId, publicationId, ...contractData } =
        createWorkContractDto;

      // Verificar que el cliente existe
      const client = await this.userRepository.findOne({
        where: { id: clientId },
      });
      if (!client) {
        throw new BadRequestException(`Client with ID ${clientId} not found`);
      }

      // Verificar que el proveedor existe
      const provider = await this.userRepository.findOne({
        where: { id: providerId },
      });
      if (!provider) {
        throw new BadRequestException(
          `Provider with ID ${providerId} not found`,
        );
      }

      // Verificar que no sean la misma persona
      if (clientId === providerId) {
        throw new BadRequestException(
          "Client and provider cannot be the same person",
        );
      }

      let publication = null;
      if (publicationId) {
        publication = await this.publicationRepository.findOne({
          where: { id: publicationId },
        });
        if (!publication) {
          throw new BadRequestException(
            `Publication with ID ${publicationId} not found`,
          );
        }
      }

      // Crear el contrato
      const workContract = this.workContractRepository.create({
        ...contractData,
        client,
        provider,
        publication,
        status: ContractStatus.PENDING,
      });

      await this.workContractRepository.save(workContract);

      // Retornar con las relaciones cargadas
      return this.findOne(workContract.id);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<WorkContract>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.workContractRepository.findAndCount({
        relations: ["client", "provider", "publication", "ratings"],
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
    role?: "client" | "provider",
  ): Promise<PaginationResponse<WorkContract>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      let whereCondition: any = {};

      if (role === "client") {
        whereCondition = { client: { id: userId } };
      } else if (role === "provider") {
        whereCondition = { provider: { id: userId } };
      } else {
        // Si no se especifica rol, buscar en ambos
        whereCondition = [
          { client: { id: userId } },
          { provider: { id: userId } },
        ];
      }

      const [data, total] = await this.workContractRepository.findAndCount({
        where: whereCondition,
        relations: ["client", "provider", "publication", "ratings"],
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

  async getUserWorkHistory(userId: number): Promise<{
    asClient: {
      total: number;
      completed: number;
      inProgress: number;
      totalSpent: number;
    };
    asProvider: {
      total: number;
      completed: number;
      inProgress: number;
      totalEarned: number;
    };
  }> {
    try {
      // Estadísticas como cliente
      const clientContracts = await this.workContractRepository.find({
        where: { client: { id: userId } },
      });

      const clientStats = {
        total: clientContracts.length,
        completed: clientContracts.filter(
          (c) => c.status === ContractStatus.COMPLETED,
        ).length,
        inProgress: clientContracts.filter(
          (c) => c.status === ContractStatus.IN_PROGRESS,
        ).length,
        totalSpent: clientContracts
          .filter(
            (c) => c.status === ContractStatus.COMPLETED && c.agreed_price,
          )
          .reduce((sum, c) => sum + Number(c.agreed_price), 0),
      };

      // Estadísticas como proveedor
      const providerContracts = await this.workContractRepository.find({
        where: { provider: { id: userId } },
      });

      const providerStats = {
        total: providerContracts.length,
        completed: providerContracts.filter(
          (c) => c.status === ContractStatus.COMPLETED,
        ).length,
        inProgress: providerContracts.filter(
          (c) => c.status === ContractStatus.IN_PROGRESS,
        ).length,
        totalEarned: providerContracts
          .filter(
            (c) => c.status === ContractStatus.COMPLETED && c.agreed_price,
          )
          .reduce((sum, c) => sum + Number(c.agreed_price), 0),
      };

      return {
        asClient: clientStats,
        asProvider: providerStats,
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<WorkContract> {
    try {
      const workContract = await this.workContractRepository.findOne({
        where: { id },
        relations: [
          "client",
          "provider",
          "publication",
          "ratings",
          "ratings.reviewer",
        ],
      });

      if (!workContract) {
        throw new NotFoundException(`Work contract with ID ${id} not found`);
      }

      return workContract;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updateWorkContractDto: UpdateWorkContractDto,
  ): Promise<WorkContract> {
    try {
      const workContract = await this.findOne(id);

      // Validaciones específicas para cambios de estado
      if (updateWorkContractDto.status) {
        const currentStatus = workContract.status;
        const newStatus = updateWorkContractDto.status;

        // Validar transiciones de estado válidas
        const validTransitions = {
          [ContractStatus.PENDING]: [
            ContractStatus.ACCEPTED,
            ContractStatus.CANCELLED,
          ],
          [ContractStatus.ACCEPTED]: [
            ContractStatus.IN_PROGRESS,
            ContractStatus.CANCELLED,
          ],
          [ContractStatus.IN_PROGRESS]: [
            ContractStatus.COMPLETED,
            ContractStatus.CANCELLED,
            ContractStatus.DISPUTED,
          ],
          [ContractStatus.COMPLETED]: [], // No se puede cambiar desde completado
          [ContractStatus.CANCELLED]: [], // No se puede cambiar desde cancelado
          [ContractStatus.DISPUTED]: [
            ContractStatus.COMPLETED,
            ContractStatus.CANCELLED,
          ],
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
          throw new BadRequestException(
            `Cannot change status from ${currentStatus} to ${newStatus}`,
          );
        }

        // Si se marca como completado, establecer fecha de finalización
        if (
          newStatus === ContractStatus.COMPLETED &&
          !updateWorkContractDto.end_date
        ) {
          updateWorkContractDto.end_date = new Date();
        }
      }

      Object.assign(workContract, updateWorkContractDto);
      await this.workContractRepository.save(workContract);

      return workContract;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const workContract = await this.findOne(id);

      // Solo permitir eliminar contratos pendientes o cancelados
      if (
        ![ContractStatus.PENDING, ContractStatus.CANCELLED].includes(
          workContract.status,
        )
      ) {
        throw new BadRequestException(
          "Only pending or cancelled contracts can be deleted",
        );
      }

      await this.workContractRepository.remove(workContract);
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
