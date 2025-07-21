import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { User } from "./entities/user.entity";
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

@Injectable()
export class UserService {
  private readonly logger = new Logger("UserService");

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
    await this.createInitialUsers();
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
      ],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
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

  async getUserStats(userId: number) {
    try {
      // Usar Repository para hacer las consultas de manera más directa
      const contractRepository =
        this.usersRepository.manager.getRepository("Contract");

      // 1. Total ganado - Contratos completados como proveedor
      const earningsResult = await contractRepository
        .createQueryBuilder("contract")
        .where("contract.providerId = :userId", { userId })
        .andWhere("contract.status = :status", { status: "accepted" })
        .select(
          "COALESCE(SUM(contract.currentPrice - (contract.currentPrice * 0.08)), 0)",
          "total_earnings",
        )
        .getRawOne();

      // 2. Total contratos completados con status 'accepted'
      const contractsResult = await contractRepository
        .createQueryBuilder("contract")
        .where("contract.providerId = :userId", { userId })
        .andWhere("contract.status = :status", { status: "accepted" })
        .select("COUNT(contract.id)", "total_contracts")
        .getRawOne();

      // 3. Total publicaciones del usuario
      const publicationRepository =
        this.usersRepository.manager.getRepository("Publication");
      const publicationsResult = await publicationRepository
        .createQueryBuilder("publication")
        .where("publication.userId = :userId", { userId })
        .select("COUNT(publication.id)", "total_publications")
        .getRawOne();

      return {
        userId,
        totalEarnings: Number(earningsResult.total_earnings) || 0,
        totalContractsCompleted: Number(contractsResult.total_contracts) || 0,
        totalPublications: Number(publicationsResult.total_publications) || 0,
      };
    } catch (error) {
      this.logger.error("Error getting user stats:", error);
      this.logger.error("Error stack:", error.stack);
      throw new InternalServerErrorException(
        "Error retrieving user statistics",
      );
    }
  }
}
