import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRut } from "../entities/user-rut.entity";
import { User } from "../entities/user.entity";
import { CreateRutDto, ReviewRutDto } from "../dto/rut.dto";

@Injectable()
export class RutService {
  constructor(
    @InjectRepository(UserRut)
    private rutRepository: Repository<UserRut>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
  ) {}

  async getUserRut(userId: number): Promise<UserRut[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["rutDocuments", "rutDocuments.reviewedBy"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return (user.rutDocuments || []).sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
  }

  async addRut(userId: number, createDto: CreateRutDto): Promise<UserRut> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const rut = this.rutRepository.create({
      ...createDto,
      user_id: userId,
      status: "pending",
    });

    return this.rutRepository.save(rut);
  }

  async deleteRut(userId: number, rutId: number): Promise<void> {
    const rut = await this.rutRepository.findOne({
      where: { id: rutId, user_id: userId },
    });

    if (!rut) {
      throw new NotFoundException("Documento RUT no encontrado");
    }

    await this.rutRepository.remove(rut);
  }

  async reviewRut(
    rutId: number,
    reviewDto: ReviewRutDto,
    reviewerId: number,
  ): Promise<UserRut> {
    const rut = await this.rutRepository.findOne({
      where: { id: rutId },
      relations: ["user", "reviewedBy"],
    });

    if (!rut) {
      throw new NotFoundException("Documento RUT no encontrado");
    }

    rut.status = reviewDto.status;
    rut.reviewed_by = reviewerId;

    if (reviewDto.description) {
      rut.description = reviewDto.description;
    }

    return this.rutRepository.save(rut);
  }

  async getUserRutByUserId(userId: number): Promise<UserRut[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return this.rutRepository.find({
      where: { user_id: userId },
      relations: ["reviewedBy"],
      order: { created_at: "ASC" },
    });
  }
}
