import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { User } from "./entities/user.entity";
import { Comment } from "../comment/entities/comment.entity";
import { Publication } from "../publication/entities/publication.entity";
import { Message } from "../message/entities/message.entity";
import {
  Contract,
  ContractBid,
  ContractOTP,
  ContractStatus,
} from "../contract/entities/contract.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from "bcrypt";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role } from "../role/entities/role.entity";
import { Permission } from "../permission/entities/permission.entity";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { Company } from "../company/entities/company.entity";
import { Education } from "./entities/education.entity";
import { Reference } from "./entities/reference.entity";
import { SocialLink } from "./entities/social-link.entity";
import { PaymentTransaction } from "../payment/entities/payment-transaction.entity";
import { PROCESSED_PAYMENT_STATUSES } from "../levels/level.rules";
import {
  StatsPeriod,
  buildPeriodRanges,
  computeCancelRate,
  computeGrowthState,
  toIsoOrNull,
} from "./stats.utils";

@Injectable()
export class UserService {
  private readonly logger = new Logger("UserService");

  /**
   * Servicio para gestión de usuarios del sistema.
   * 
   * NOTA IMPORTANTE sobre la cédula:
   * - Para usuarios PERSON: La cédula es obligatoria (validado en el frontend)
   * - Para usuarios BUSINESS: La cédula es opcional y puede ser null
   * - El frontend puede enviar string vacío o null para empresas
   * - El backend normalizará strings vacíos a null
   */

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>, // eslint-disable-line no-unused-vars

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>, // eslint-disable-line no-unused-vars

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>, // eslint-disable-line no-unused-vars

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>, // eslint-disable-line no-unused-vars

    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>, // eslint-disable-line no-unused-vars

    @InjectRepository(Reference)
    private readonly referenceRepository: Repository<Reference>, // eslint-disable-line no-unused-vars

    @InjectRepository(SocialLink)
    private readonly socialLinkRepository: Repository<SocialLink>, // eslint-disable-line no-unused-vars
  ) {}

  async onModuleInit() {
    await this.createPermissionsAndRoles();
    // await this.createInitialUsers(); // Comentado para no crear usuarios duplicados en cada reinicio
  }

  private async createPermissionsAndRoles() {
    try {
      const permissions = [
        "WRITE",
        "READ",
        "UPDATE",
        "DELETE",
        "MANAGE_LOCATION", // Nuevo permiso para gestionar ubicación
      ];

      const rolesData = {
        PERSON: ["WRITE", "READ", "UPDATE"],
        BUSINESS: ["WRITE", "READ", "UPDATE", "MANAGE_LOCATION"], // BUSINESS puede gestionar su ubicación
        ADMIN: ["WRITE", "READ", "UPDATE", "DELETE", "MANAGE_LOCATION"], // ADMIN puede gestionar todas las ubicaciones
      };

      // 1. Crear permisos si no existen
      for (const permissionName of permissions) {
        const existingPermission = await this.permissionRepository.findOne({
          where: { name: permissionName },
        });
        if (!existingPermission) {
          const newPermission = this.permissionRepository.create({
            name: permissionName,
          });
          await this.permissionRepository.save(newPermission);
        }
      }

      // 2. Crear roles con los permisos adecuados
      for (const [roleName, permissionNames] of Object.entries(rolesData)) {
        let role = await this.roleRepository.findOne({
          where: { name: roleName },
          relations: ["permissions"],
        });

        if (!role) {
          role = this.roleRepository.create({ name: roleName });
        }

        // Asignar permisos al rol
        const rolePermissions = await this.permissionRepository.find({
          where: permissionNames.map((name) => ({ name })),
        });

        role.permissions = rolePermissions;
        await this.roleRepository.save(role);
      }

      this.logger.log("Roles and permissions created successfully.");
    } catch (error) {
      this.logger.error("Error creating roles and permissions:", error);
    }
  }

  private async createInitialUsers() {
    try {
      // Definir los datos de los usuarios iniciales
      const initialUsers = [
        {
          name: "Admin User",
          email: "fernandodj2004+admin@gmail.com",
          password: "admin123",
          genre: "Male",
          cellphone: "1234567890",
          cv_url: "",
          born_at: new Date("1990-01-01"),
          roleName: "ADMIN",
        },
        {
          name: "Business User",
          email: "fernandodj2004+business@gmail.com",
          password: "business123",
          genre: "Female",
          cellphone: "2345678901",
          cv_url: "",
          born_at: new Date("1985-05-15"),
          // cedula es opcional para empresas
          roleName: "BUSINESS",
          company: {
            nit: "900123456-7",
            name: "Empresa de Prueba",
            born_at: new Date("2020-01-01"),
            email: "empresa@example.com",
            cellphone: "+573001234567",
            // Ubicación de la Universidad Icesi en Cali
            latitude: 3.3417,
            longitude: -76.5306,
            address: "Calle 18 #122-135",
            city: "Cali",
            country: "Colombia",
          },
        },
        {
          name: "Regular Person",
          email: "fernandodj2004+person@gmail.com",
          password: "person123",
          genre: "Male",
          cedula: "1234567890",
          cellphone: "3456789012",
          cv_url: "",
          born_at: new Date("1995-10-20"),
          roleName: "PERSON",
        },
        {
          name: "Regular Person 2",
          email: "fernandodj2004+person2@gmail.com",
          password: "person123",
          genre: "Male",
          cedula: "0987654321",
          cellphone: "3456789012",
          cv_url: "",
          born_at: new Date("1995-10-20"),
          roleName: "PERSON",
        }
      ];

      // Crear cada usuario si no existe ya
      for (const userData of initialUsers) {
        const { roleName, company, ...userInfo } = userData;

        // Verificar si el usuario ya existe por email
        const existingUser = await this.usersRepository.findOne({
          where: { email: userInfo.email },
          relations: ["roles", "company"],
        });

        if (!existingUser) {
          // Buscar el rol correspondiente
          const role = await this.roleRepository.findOne({
            where: { name: roleName },
          });
          if (!role) {
            this.logger.warn(
              `Role ${roleName} not found for user ${userInfo.name}`,
            );
            continue;
          }

          let companyEntity = null;
          // Si el usuario es BUSINESS y tiene datos de empresa, crear la empresa primero
          if (roleName === "BUSINESS" && company) {
            companyEntity = this.companyRepository.create({
              ...company,
              created_at: new Date(),
            });
            await this.companyRepository.save(companyEntity);
          }

          // Crear el usuario
          const user = this.usersRepository.create({
            ...userInfo,
            password: bcrypt.hashSync(userInfo.password, 10),
            created_at: new Date(),
            roles: [role],
            company: companyEntity,
          });

          await this.usersRepository.save(user);
          this.logger.log(
            `User ${userInfo.name} with role ${roleName} created successfully.`,
          );
        } else {
          this.logger.log(`User ${userInfo.email} already exists.`);

          // Verificar y actualizar roles si es necesario
          const hasRole = existingUser.roles.some((r) => r.name === roleName);
          if (!hasRole) {
            const role = await this.roleRepository.findOne({
              where: { name: roleName },
            });
            if (role) {
              existingUser.roles = [role]; // Asignar solo el rol necesario
              await this.usersRepository.save(existingUser);
              this.logger.log(`Updated role for user ${userInfo.email}`);
            }
          }

          // Si es BUSINESS y no tiene empresa, crear la empresa
          if (roleName === "BUSINESS" && company && !existingUser.company) {
            const companyEntity = this.companyRepository.create({
              ...company,
              created_at: new Date(),
            });
            await this.companyRepository.save(companyEntity);

            existingUser.company = companyEntity;
            await this.usersRepository.save(existingUser);
            this.logger.log(`Added company to existing user ${userInfo.email}`);
          }
        }
      }

      this.logger.log("Initial users created successfully.");
    } catch (error) {
      this.logger.error("Error creating initial users:", error);
      throw error; // Propagar el error para ver el stack trace completo
    }
  }

  // Actualización del método create en UserService para manejar la relación con el empleador
  async create(createUserDto: CreateUserDto) {
    try {
      const {
        password,
        email,
        roles: roleNames,
        employerId,
        companyId,
        education, // eslint-disable-line no-unused-vars
        references, // eslint-disable-line no-unused-vars
        socialLinks, // eslint-disable-line no-unused-vars
        cedula, // Cédula es opcional para empresas, obligatorio para personas (validado en frontend)
        ...userData
      } = createUserDto;

      const existingUser = await this.usersRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException("Este correo ya está en uso");
      }

      // Buscar los roles en la base de datos
      const roles = [];
      if (roleNames && roleNames.length > 0) {
        for (const roleName of roleNames) {
          const role = await this.roleRepository.findOne({
            where: { name: roleName },
          });
          if (!role) {
            throw new BadRequestException(`Role ${roleName} not found`);
          }
          roles.push(role);
        }
      }

      const user = this.usersRepository.create({
        ...userData,
        email,
        password: bcrypt.hashSync(password, 10),
        created_at: new Date(),
        roles,
        // Solo asignar cédula si se proporciona y no es string vacío
        cedula: cedula && cedula.trim() !== '' ? cedula : null,
      });

      // Vincular con la empresa administrada (oneToOne)
      if (companyId) {
        const company = await this.companyRepository.findOne({
          where: { id: companyId },
        });
        if (!company) {
          throw new BadRequestException(
            `Company with ID ${companyId} not found`,
          );
        }
        user.company = company;
      }

      // Vincular con la empresa como empleador (manyToOne)
      if (employerId) {
        const employer = await this.companyRepository.findOne({
          where: { id: employerId },
        });
        if (!employer) {
          throw new BadRequestException(
            `Employer company with ID ${employerId} not found`,
          );
        }
        user.employer = employer;
      }

      // Antes de guardar el usuario, elimina las relaciones anidadas para evitar updates a null
      delete (user as any).socialLinks;
      delete (user as any).education;
      delete (user as any).references;
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Actualización del método update en UserService para manejar la relación con el empleador
  async update(id: number, updateDto: UpdateUserDto) {
    this.logger.log("UpdateUserDto recibido (raw):", JSON.stringify(updateDto));
    const {
      roles: roleNames,
      employerId,
      companyId,
      education,
      references,
      socialLinks,
      cedula,
      ...updateData
    } = updateDto;
    this.logger.log("education recibido:", JSON.stringify(education));
    this.logger.log("references recibido:", JSON.stringify(references));
    this.logger.log("socialLinks recibido:", JSON.stringify(socialLinks));

    // Buscar el usuario a actualizar
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Manejar cédula de manera especial si viene en el DTO
    if (typeof cedula !== "undefined") {
      (updateData as any).cedula = cedula && cedula.trim() !== '' ? cedula : null;
    }

    // 1. Actualizar campos simples
    await this.usersRepository.update(id, updateData);

    // 2. Actualizar roles si vienen en el DTO
    if (roleNames && Array.isArray(roleNames) && roleNames.length > 0) {
      const roles = [];
      for (const roleName of roleNames) {
        const role = await this.roleRepository.findOne({
          where: { name: roleName },
        });
        if (!role) throw new BadRequestException(`Role ${roleName} not found`);
        roles.push(role);
      }
      user.roles = roles;
      await this.usersRepository.save(user); // Solo para roles, no para relaciones anidadas
    }

    // 3. Actualizar employer si viene en el DTO
    if (typeof employerId !== "undefined") {
      if (employerId === null) {
        user.employer = null;
      } else {
        const employer = await this.companyRepository.findOne({
          where: { id: employerId },
        });
        if (!employer)
          throw new BadRequestException(
            `Employer company with ID ${employerId} not found`,
          );
        user.employer = employer;
      }
      await this.usersRepository.save(user); // Solo para employer
    }

    // 4. Actualizar company si viene en el DTO
    if (typeof companyId !== "undefined") {
      if (companyId === null) {
        user.company = null;
      } else {
        const company = await this.companyRepository.findOne({
          where: { id: companyId },
        });
        if (!company)
          throw new BadRequestException(
            `Company with ID ${companyId} not found`,
          );
        user.company = company;
      }
      await this.usersRepository.save(user); // Solo para company
    }

    // 5. Actualizar relaciones anidadas (education, references, socialLinks)
    const userEntity = await this.usersRepository.findOne({ where: { id } });

    if (typeof education !== "undefined") {
      await this.educationRepository.delete({ user: { id } });
      if (Array.isArray(education) && education.length > 0) {
        for (const edu of education) {
          if (edu.institution && edu.degree && edu.startDate) {
            delete (edu as any).user;
            delete (edu as any).user_id;
            const eduEntity = this.educationRepository.create({
              ...edu,
              user: userEntity,
              startDate:
                typeof edu.startDate === "string"
                  ? new Date(edu.startDate)
                  : edu.startDate,
              endDate: edu.endDate
                ? typeof edu.endDate === "string"
                  ? new Date(edu.endDate)
                  : edu.endDate
                : null,
            });
            await this.educationRepository.save(eduEntity);
          }
        }
      }
    }

    if (typeof references !== "undefined") {
      await this.referenceRepository.delete({ user: { id } });
      if (Array.isArray(references) && references.length > 0) {
        for (const ref of references) {
          if (ref.name && ref.relationship && ref.contact) {
            delete (ref as any).user;
            delete (ref as any).user_id;
            const refEntity = this.referenceRepository.create({
              ...ref,
              user: userEntity,
            });
            await this.referenceRepository.save(refEntity);
          }
        }
      }
    }

    if (typeof socialLinks !== "undefined") {
      await this.socialLinkRepository.delete({ user: { id } });
      if (Array.isArray(socialLinks) && socialLinks.length > 0) {
        for (const link of socialLinks) {
          if (link.type && link.url) {
            delete (link as any).user;
            delete (link as any).user_id;
            const linkEntity = this.socialLinkRepository.create({
              ...link,
              user: userEntity,
            });
            await this.socialLinkRepository.save(linkEntity);
          }
        }
      }
    }

    // Devuelve el usuario actualizado
    return this.findOne(id);
  }

  async findByEmail(email: string) {
    const user: User = await this.usersRepository.findOne({
      where: { email },
      relations: ["roles"],
    });
    if (!user) {
      throw new NotFoundException(
        "Email not found, please register or try again.",
      );
    }
    return user;
  }

  async findByCellphone(cellphone: string) {
    const user: User = await this.usersRepository.findOne({
      where: { cellphone },
      relations: ["roles"],
    });
    if (!user) {
      throw new NotFoundException(
        "Phone number not found, please register or try again.",
      );
    }
    return user;
  }

  async findAllCompanies(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.usersRepository.findAndCount({
        relations: ["roles", "company"],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
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

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.usersRepository.findAndCount({
        relations: ["roles", "company", "education", "idPhotos", "idPhotos.reviewedBy"],
        skip,
        take: limit,
      });

      // Calcular metadata para la paginación
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

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        "roles",
        "company",
        "publications",
        "comments",
        "experiences",
        "education",
        "references",
        "socialLinks",
        "idPhotos"
      ],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async remove(id: number) {
    // To safely delete a user and avoid FK constraint violations, remove dependent
    // records that reference the user first within a transaction. We intentionally
    // delete comments, publications and messages here so the user removal does
    // not fail when DB constraints do not have ON DELETE CASCADE.
    return await this.usersRepository.manager.transaction(async (manager) => {
      // Ensure the user exists
      const user = await manager.findOne(User, { where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // 1) Delete user-related entities with explicit user_id column
      try {
        // Terms acceptance
        await manager.query('DELETE FROM user_terms_acceptance WHERE user_id = $1', [id]);
        // Gallery (user_id column)
        await manager.query('DELETE FROM user_gallery WHERE user_id = $1', [id]);
        // ID Photos (user_id column)
        await manager.query('DELETE FROM user_id_photos WHERE user_id = $1', [id]);
        // Education (user_id column)
        await manager.query('DELETE FROM education WHERE user_id = $1', [id]);
        // References (user_id column)
        await manager.query('DELETE FROM reference WHERE user_id = $1', [id]);
        // Social Links (user_id column)
        await manager.query('DELETE FROM social_link WHERE user_id = $1', [id]);
      } catch (err) {
        this.logger.error('Error deleting user profile data', err);
        throw err;
      }

      // 2) Delete comments authored by the user
      try {
        await manager
          .createQueryBuilder()
          .delete()
          .from(Comment)
          .where('"userId" = :userId', { userId: id })
          .execute();
      } catch (err) {
        this.logger.error('Error deleting user comments', err);
        throw err;
      }

      // 2) Delete publications created by the user (this will cascade to publication-related rows if configured)
      try {
        await manager
          .createQueryBuilder()
          .delete()
          .from(Publication)
          .where('"userId" = :userId', { userId: id })
          .execute();
      } catch (err) {
        this.logger.error('Error deleting user publications', err);
        throw err;
      }

      // 3) Delete messages where the user is sender or recipient
      try {
        await manager
          .createQueryBuilder()
          .delete()
          .from(Message)
          .where('"senderId" = :userId OR "recipientId" = :userId', { userId: id })
          .execute();
      } catch (err) {
        this.logger.error('Error deleting user messages', err);
        throw err;
      }

      // 4) Delete contract-related records where the user participates
      try {
        // Delete bids made by the user
        await manager
          .createQueryBuilder()
          .delete()
          .from(ContractBid)
          .where('"bidderId" = :userId', { userId: id })
          .execute();

        // Delete OTPs for contracts that belong to the user as client or provider
        // First, find contract ids where user is client or provider
        const contractIdsResult: { id: string }[] = await manager
          .createQueryBuilder()
          .select('contract.id', 'id')
          .from(Contract, 'contract')
          .where('"clientId" = :userId OR "providerId" = :userId', { userId: id })
          .getRawMany();

        const contractIds = contractIdsResult.map((r) => r.id);
        if (contractIds.length > 0) {
          // Delete OTPs for those contracts
          await manager
            .createQueryBuilder()
            .delete()
            .from(ContractOTP)
            .where('"contractId" IN (:...ids)', { ids: contractIds })
            .execute();

          // Delete bids linked to those contracts (if any remain)
          await manager
            .createQueryBuilder()
            .delete()
            .from(ContractBid)
            .where('"contractId" IN (:...ids)', { ids: contractIds })
            .execute();

          // Delete the contracts themselves
          await manager
            .createQueryBuilder()
            .delete()
            .from(Contract)
            .where('"id" IN (:...ids)', { ids: contractIds })
            .execute();
        }
      } catch (err) {
        this.logger.error('Error deleting user contracts and related records', err);
        throw err;
      }

      // 4) Finally remove the user entity (this will also remove role mappings)
      try {
        // Remove explicit join table rows in case the join table has restrictive FK
        await manager.query('DELETE FROM roles_users_users WHERE user_id = $1', [id]);

        await manager
          .createQueryBuilder()
          .delete()
          .from(User)
          .where('id = :id', { id })
          .execute();
      } catch (err) {
        this.logger.error('Error deleting user', err);
        throw err;
      }
    });
  }

  private handleDBErrors(error: any) {
    if (error.status === 400)
      throw new BadRequestException(error.response.message);

    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException("Please check server logs");
  }

  private handleDBExceptions(error: any) {
    if (error.code === "23505") throw new BadRequestException(error.detail);

    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }

  // Método adicional para obtener usuarios por empleador
  async findByEmployer(
    employerId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const queryBuilder = this.usersRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.roles", "roles")
        .leftJoinAndSelect("user.company", "company")
        .where("user.employerId = :employerId", { employerId })
        .orderBy("user.created_at", "DESC")
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

  async searchUsers(
    query: string,
    limit: number = 10,
    currentUserId: number,
  ): Promise<User[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchQuery = query.trim().toLowerCase();

      const users = await this.usersRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.roles", "roles")
        .leftJoinAndSelect("user.company", "company")
        .where(
          "(LOWER(user.name) LIKE :query OR LOWER(user.email) LIKE :query)",
          { query: `%${searchQuery}%` },
        )
        .andWhere("user.id != :currentUserId", { currentUserId }) // Excluir al usuario actual
        .orderBy("user.name", "ASC")
        .limit(limit)
        .getMany();

      return users;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getUserStats(userId: number, period?: string) {
    try {
      const normalizedPeriod = this.normalizeStatsPeriod(period);
      const range = buildPeriodRanges(normalizedPeriod);

      const userRatings = await this.usersRepository
        .createQueryBuilder("user")
        .select(["user.average_rating", "user.total_ratings"])
        .where("user.id = :userId", { userId })
        .getRawOne();

      const ratingAvg = Number(userRatings?.user_average_rating ?? 0);
      const ratingCount = Number(userRatings?.user_total_ratings ?? 0);

      const emptyStats = {
        earnings_gross: 0,
        contracts_successful: 0,
        contracts_cancelled: 0,
        publications_total: 0,
      };

      const [currentStats, previousStats, totalStats] = await Promise.all([
        this.getPeriodStats(userId, range.from, range.to),
        normalizedPeriod === "total"
          ? Promise.resolve(emptyStats)
          : this.getPeriodStats(userId, range.previousFrom, range.previousTo),
        normalizedPeriod === "total"
          ? Promise.resolve(null)
          : this.getPeriodStats(userId, null, null),
      ]);

      const currentPeriod = {
        from: toIsoOrNull(range.from),
        to: toIsoOrNull(range.to),
        earnings_gross: currentStats.earnings_gross,
        contracts_successful: currentStats.contracts_successful,
        contracts_cancelled: currentStats.contracts_cancelled,
        cancel_rate: computeCancelRate(
          currentStats.contracts_successful,
          currentStats.contracts_cancelled,
        ),
        rating_avg: ratingAvg,
        rating_count: ratingCount,
        publications_total: currentStats.publications_total,
      };

      const previousPeriod = {
        from: toIsoOrNull(range.previousFrom),
        to: toIsoOrNull(range.previousTo),
        earnings_gross: previousStats.earnings_gross,
        contracts_successful: previousStats.contracts_successful,
        contracts_cancelled: previousStats.contracts_cancelled,
        cancel_rate: computeCancelRate(
          previousStats.contracts_successful,
          previousStats.contracts_cancelled,
        ),
        rating_avg: ratingAvg,
        rating_count: ratingCount,
        publications_total: previousStats.publications_total,
      };

      const totals = normalizedPeriod === "total" ? currentStats : totalStats;

      return {
        userId,
        period: normalizedPeriod,
        current_period: currentPeriod,
        previous_period: previousPeriod,
        growth_state: computeGrowthState(currentPeriod, previousPeriod),
        totalEarnings: totals?.earnings_gross ?? 0,
        totalContractsCompleted: totals?.contracts_successful ?? 0,
        totalPublications: totals?.publications_total ?? 0,
      };
    } catch (error) {
      this.logger.error("Error getting user stats:", error);
      this.logger.error("Error stack:", error.stack);
      throw new InternalServerErrorException(
        "Error retrieving user statistics",
      );
    }
  }

  private normalizeStatsPeriod(value?: string): StatsPeriod {
    const period = (value || "month").toLowerCase();
    const allowed: StatsPeriod[] = ["week", "month", "quarter", "year", "total"];
    if (!allowed.includes(period as StatsPeriod)) {
      throw new BadRequestException(
        `Invalid period "${value}". Use week|month|quarter|year|total.`,
      );
    }
    return period as StatsPeriod;
  }

  private async getPeriodStats(
    userId: number,
    from: Date | null,
    to: Date | null,
  ): Promise<{
    earnings_gross: number;
    contracts_successful: number;
    contracts_cancelled: number;
    publications_total: number;
  }> {
    const paymentRepository =
      this.usersRepository.manager.getRepository(PaymentTransaction);
    const contractRepository =
      this.usersRepository.manager.getRepository(Contract);
    const publicationRepository =
      this.usersRepository.manager.getRepository(Publication);

    const useRange = Boolean(from && to);

    const earningsQuery = paymentRepository
      .createQueryBuilder("payment")
      .select("COALESCE(SUM(payment.amount), 0)", "earnings_gross")
      .where("payment.payeeId = :userId", { userId })
      .andWhere("payment.status IN (:...statuses)", {
        statuses: PROCESSED_PAYMENT_STATUSES,
      });

    if (useRange) {
      earningsQuery.andWhere(
        "COALESCE(payment.paid_at, payment.updated_at) BETWEEN :from AND :to",
        { from, to },
      );
    }

    const successfulQuery = contractRepository
      .createQueryBuilder("contract")
      .select("COUNT(contract.id)", "contracts_successful")
      .where("contract.providerId = :userId", { userId })
      .andWhere("contract.status = :status", {
        status: ContractStatus.COMPLETED,
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("1")
          .from(PaymentTransaction, "payment")
          .where("payment.contractId = contract.id")
          .andWhere("payment.status IN (:...processedStatuses)")
          .getQuery();
        return `EXISTS ${subQuery}`;
      })
      .setParameter("processedStatuses", PROCESSED_PAYMENT_STATUSES);

    if (useRange) {
      successfulQuery.andWhere(
        "COALESCE(contract.completed_at, contract.\"updatedAt\") BETWEEN :from AND :to",
        { from, to },
      );
    }

    const cancelledQuery = contractRepository
      .createQueryBuilder("contract")
      .select("COUNT(contract.id)", "contracts_cancelled")
      .where("contract.providerId = :userId", { userId })
      .andWhere("contract.status = :status", {
        status: ContractStatus.CANCELLED,
      });

    if (useRange) {
      cancelledQuery.andWhere(
        "COALESCE(contract.cancelled_at, contract.\"updatedAt\") BETWEEN :from AND :to",
        { from, to },
      );
    }

    const publicationsQuery = publicationRepository
      .createQueryBuilder("publication")
      .select("COUNT(publication.id)", "publications_total")
      .where("publication.userId = :userId", { userId });

    if (useRange) {
      publicationsQuery.andWhere(
        "publication.created_at BETWEEN :from AND :to",
        { from, to },
      );
    }

    const [
      earningsResult,
      contractsResult,
      cancelledResult,
      publicationsResult,
    ] = await Promise.all([
      earningsQuery.getRawOne(),
      successfulQuery.getRawOne(),
      cancelledQuery.getRawOne(),
      publicationsQuery.getRawOne(),
    ]);

    return {
      earnings_gross: Number(earningsResult?.earnings_gross ?? 0),
      contracts_successful: Number(contractsResult?.contracts_successful ?? 0),
      contracts_cancelled: Number(cancelledResult?.contracts_cancelled ?? 0),
      publications_total: Number(publicationsResult?.publications_total ?? 0),
    };
  }
}
