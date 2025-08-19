import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserIdPhotos } from "../entities/user-id-photos.entity";
import { User } from "../entities/user.entity";
import {
  CreateIdPhotoDto,
  UpdateIdPhotoDto,
  ReviewIdPhotoDto,
} from "../dto/id-photos.dto";

@Injectable()
export class IdPhotosService {
  constructor(
    @InjectRepository(UserIdPhotos)
    private idPhotosRepository: Repository<UserIdPhotos>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
  ) {}

  async getUserIdPhotos(userId: number): Promise<UserIdPhotos[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["idPhotos", "idPhotos.reviewedBy"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user.idPhotos.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  async addIdPhoto(
    userId: number,
    createDto: CreateIdPhotoDto,
  ): Promise<UserIdPhotos> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["idPhotos"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar que no exista ya una foto del mismo tipo
    const existingPhoto = user.idPhotos.find(
      photo => photo.photo_type === createDto.photo_type
    );

    if (existingPhoto) {
      throw new BadRequestException(
        `Ya existe una foto de cédula del tipo ${createDto.photo_type}. Use PUT para actualizar.`
      );
    }

    const idPhoto = this.idPhotosRepository.create({
      ...createDto,
      user_id: userId,
      status: "pending",
    });

    return this.idPhotosRepository.save(idPhoto);
  }

  async updateIdPhoto(
    userId: number,
    photoId: number,
    updateDto: UpdateIdPhotoDto,
  ): Promise<UserIdPhotos> {
    const idPhoto = await this.idPhotosRepository.findOne({
      where: { id: photoId, user_id: userId },
      relations: ["reviewedBy"],
    });

    if (!idPhoto) {
      throw new NotFoundException("Foto de cédula no encontrada");
    }

    // Si se actualiza la foto, resetear el estado a pending
    if (updateDto.image_url || updateDto.image_path) {
      updateDto.status = "pending";
      updateDto.reviewed_by = null;
    }

    Object.assign(idPhoto, updateDto);
    return this.idPhotosRepository.save(idPhoto);
  }

  async deleteIdPhoto(userId: number, photoId: number): Promise<void> {
    const idPhoto = await this.idPhotosRepository.findOne({
      where: { id: photoId, user_id: userId },
    });

    if (!idPhoto) {
      throw new NotFoundException("Foto de cédula no encontrada");
    }

    await this.idPhotosRepository.remove(idPhoto);
  }

  async reviewIdPhoto(
    photoId: number,
    reviewDto: ReviewIdPhotoDto,
    reviewerId: number,
  ): Promise<UserIdPhotos> {
    const idPhoto = await this.idPhotosRepository.findOne({
      where: { id: photoId },
      relations: ["user", "reviewedBy"],
    });

    if (!idPhoto) {
      throw new NotFoundException("Foto de cédula no encontrada");
    }

    // Actualizar el estado y el revisor
    idPhoto.status = reviewDto.status;
    idPhoto.reviewed_by = reviewerId;
    
    if (reviewDto.description) {
      idPhoto.description = reviewDto.description;
    }

    return this.idPhotosRepository.save(idPhoto);
  }

  async getAllPendingPhotos(): Promise<UserIdPhotos[]> {
    return this.idPhotosRepository.find({
      where: { status: "pending" },
      relations: ["user"],
      order: { created_at: "ASC" },
    });
  }

  async getPhotoById(photoId: number): Promise<UserIdPhotos> {
    const idPhoto = await this.idPhotosRepository.findOne({
      where: { id: photoId },
      relations: ["user", "reviewedBy"],
    });

    if (!idPhoto) {
      throw new NotFoundException("Foto de cédula no encontrada");
    }

    return idPhoto;
  }

  async getUserIdPhotosByUserId(userId: number): Promise<UserIdPhotos[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return this.idPhotosRepository.find({
      where: { user_id: userId },
      relations: ["reviewedBy"],
      order: { created_at: "ASC" },
    });
  }
}