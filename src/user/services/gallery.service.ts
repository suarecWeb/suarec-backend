import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserGallery } from "../entities/user-gallery.entity";
import { User } from "../entities/user.entity";
import {
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
  UploadGalleryImagesDto,
} from "../dto/gallery.dto";

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(UserGallery)
    private galleryRepository: Repository<UserGallery>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUserGallery(userId: number): Promise<UserGallery[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["gallery"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user.gallery.sort((a, b) => a.order_index - b.order_index);
  }

  async addImageToGallery(
    userId: number,
    createDto: CreateGalleryImageDto,
  ): Promise<UserGallery> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["gallery"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar límite de 20 imágenes
    if (user.gallery.length >= 20) {
      throw new BadRequestException(
        "La galería no puede tener más de 20 imágenes",
      );
    }

    const galleryImage = this.galleryRepository.create({
      ...createDto,
      user_id: userId,
      order_index: user.gallery.length,
    });

    return this.galleryRepository.save(galleryImage);
  }

  async uploadMultipleImages(
    userId: number,
    uploadDto: UploadGalleryImagesDto,
  ): Promise<UserGallery[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["gallery"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar límite de 20 imágenes
    const currentCount = user.gallery.length;
    const newImagesCount = uploadDto.image_urls.length;

    if (currentCount + newImagesCount > 20) {
      throw new BadRequestException(
        `No se pueden agregar ${newImagesCount} imágenes. La galería ya tiene ${currentCount} imágenes y el límite es 20.`,
      );
    }

    const galleryImages = uploadDto.image_urls.map((url, index) => {
      return this.galleryRepository.create({
        image_url: url,
        image_path: uploadDto.image_paths[index],
        description: uploadDto.description,
        user_id: userId,
        order_index: currentCount + index,
      });
    });

    return this.galleryRepository.save(galleryImages);
  }

  async updateImage(
    userId: number,
    imageId: number,
    updateDto: UpdateGalleryImageDto,
  ): Promise<UserGallery> {
    const galleryImage = await this.galleryRepository.findOne({
      where: { id: imageId, user_id: userId },
    });

    if (!galleryImage) {
      throw new NotFoundException("Imagen no encontrada");
    }

    Object.assign(galleryImage, updateDto);
    return this.galleryRepository.save(galleryImage);
  }

  async deleteImage(userId: number, imageId: number): Promise<void> {
    const galleryImage = await this.galleryRepository.findOne({
      where: { id: imageId, user_id: userId },
    });

    if (!galleryImage) {
      throw new NotFoundException("Imagen no encontrada");
    }

    await this.galleryRepository.remove(galleryImage);

    // Reordenar las imágenes restantes
    const remainingImages = await this.galleryRepository.find({
      where: { user_id: userId },
      order: { order_index: "ASC" },
    });

    for (let i = 0; i < remainingImages.length; i++) {
      remainingImages[i].order_index = i;
      await this.galleryRepository.save(remainingImages[i]);
    }
  }

  async reorderImages(
    userId: number,
    imageIds: number[],
  ): Promise<UserGallery[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["gallery"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar que todas las imágenes pertenecen al usuario
    const userImageIds = user.gallery.map((img) => img.id);
    const allImagesBelongToUser = imageIds.every((id) =>
      userImageIds.includes(id),
    );

    if (!allImagesBelongToUser) {
      throw new BadRequestException(
        "Algunas imágenes no pertenecen al usuario",
      );
    }

    // Actualizar el orden
    const updatePromises = imageIds.map((imageId, index) => {
      return this.galleryRepository.update(imageId, { order_index: index });
    });

    await Promise.all(updatePromises);

    return this.getUserGallery(userId);
  }
}
