import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyGallery } from "../entities/company-gallery.entity";
import { Company } from "../entities/company.entity";
import {
  CreateCompanyGalleryImageDto,
  UpdateCompanyGalleryImageDto,
  UploadCompanyGalleryImagesDto,
} from "../dto/gallery.dto";

@Injectable()
export class CompanyGalleryService {
  constructor(
    @InjectRepository(CompanyGallery)
    private galleryRepository: Repository<CompanyGallery>, // eslint-disable-line no-unused-vars
    @InjectRepository(Company)
    private companyRepository: Repository<Company>, // eslint-disable-line no-unused-vars
  ) {}

  async getCompanyGallery(companyId: string): Promise<CompanyGallery[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ["gallery"],
    });

    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    return company.gallery.sort((a, b) => a.order_index - b.order_index);
  }

  async addImageToGallery(
    companyId: string,
    createDto: CreateCompanyGalleryImageDto,
  ): Promise<CompanyGallery> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ["gallery"],
    });

    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    // Verificar límite de 20 imágenes
    if (company.gallery.length >= 20) {
      throw new BadRequestException(
        "La galería no puede tener más de 20 imágenes",
      );
    }

    const galleryImage = this.galleryRepository.create({
      ...createDto,
      company_id: companyId,
      order_index: company.gallery.length,
    });

    return this.galleryRepository.save(galleryImage);
  }

  async uploadMultipleImages(
    companyId: string,
    uploadDto: UploadCompanyGalleryImagesDto,
  ): Promise<CompanyGallery[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ["gallery"],
    });

    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    // Verificar límite de 20 imágenes
    const currentCount = company.gallery.length;
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
        company_id: companyId,
        order_index: currentCount + index,
      });
    });

    return this.galleryRepository.save(galleryImages);
  }

  async updateImage(
    companyId: string,
    imageId: number,
    updateDto: UpdateCompanyGalleryImageDto,
  ): Promise<CompanyGallery> {
    const galleryImage = await this.galleryRepository.findOne({
      where: { id: imageId, company_id: companyId },
    });

    if (!galleryImage) {
      throw new NotFoundException("Imagen no encontrada");
    }

    Object.assign(galleryImage, updateDto);
    return this.galleryRepository.save(galleryImage);
  }

  async deleteImage(companyId: string, imageId: number): Promise<void> {
    const galleryImage = await this.galleryRepository.findOne({
      where: { id: imageId, company_id: companyId },
    });

    if (!galleryImage) {
      throw new NotFoundException("Imagen no encontrada");
    }

    await this.galleryRepository.remove(galleryImage);

    // Reordenar las imágenes restantes
    const remainingImages = await this.galleryRepository.find({
      where: { company_id: companyId },
      order: { order_index: "ASC" },
    });

    for (let i = 0; i < remainingImages.length; i++) {
      remainingImages[i].order_index = i;
      await this.galleryRepository.save(remainingImages[i]);
    }
  }

  async reorderImages(
    companyId: string,
    imageIds: number[],
  ): Promise<CompanyGallery[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ["gallery"],
    });

    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    // Verificar que todas las imágenes pertenecen a la empresa
    const companyImageIds = company.gallery.map((img) => img.id);
    const allImagesBelongToCompany = imageIds.every((id) =>
      companyImageIds.includes(id),
    );

    if (!allImagesBelongToCompany) {
      throw new BadRequestException(
        "Algunas imágenes no pertenecen a la empresa",
      );
    }

    // Actualizar el orden
    const updatePromises = imageIds.map((imageId, index) => {
      return this.galleryRepository.update(imageId, { order_index: index });
    });

    await Promise.all(updatePromises);

    return this.getCompanyGallery(companyId);
  }
}
