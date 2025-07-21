import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BankInfo } from "../entities/bank-info.entity";
import { User } from "../entities/user.entity";
import { CreateBankInfoDto, UpdateBankInfoDto, BankInfoResponseDto } from "../dto/bank-info.dto";

@Injectable()
export class BankInfoService {
  constructor(
    @InjectRepository(BankInfo)
    private bankInfoRepository: Repository<BankInfo>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: number, createBankInfoDto: CreateBankInfoDto): Promise<BankInfoResponseDto> {
    // Verificar si el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["bankInfo"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Si ya tiene información bancaria, actualizar en lugar de crear
    if (user.bankInfo) {
      return this.update(userId, createBankInfoDto);
    }

    // Crear nueva información bancaria
    const bankInfo = this.bankInfoRepository.create({
      ...createBankInfoDto,
      user,
    });

    const savedBankInfo = await this.bankInfoRepository.save(bankInfo);
    
    return this.mapToResponseDto(savedBankInfo);
  }

  async findByUserId(userId: number, requestingUserId: number, isAdmin: boolean): Promise<BankInfoResponseDto | null> {
    // Solo el dueño de la cuenta o un admin pueden ver la información bancaria
    if (userId !== requestingUserId && !isAdmin) {
      throw new ForbiddenException("No tienes permisos para acceder a esta información");
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["bankInfo"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (!user.bankInfo) {
      return null;
    }

    return this.mapToResponseDto(user.bankInfo);
  }

  async update(userId: number, updateBankInfoDto: UpdateBankInfoDto): Promise<BankInfoResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["bankInfo"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (!user.bankInfo) {
      // Si no tiene información bancaria, crear una nueva
      return this.create(userId, updateBankInfoDto);
    }

    // Actualizar información existente
    await this.bankInfoRepository.update(user.bankInfo.id, updateBankInfoDto);
    
    const updatedBankInfo = await this.bankInfoRepository.findOne({
      where: { id: user.bankInfo.id },
    });

    return this.mapToResponseDto(updatedBankInfo);
  }

  async delete(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["bankInfo"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (user.bankInfo) {
      await this.bankInfoRepository.delete(user.bankInfo.id);
    }
  }

  private mapToResponseDto(bankInfo: BankInfo): BankInfoResponseDto {
    return {
      id: bankInfo.id,
      accountHolderName: bankInfo.accountHolderName,
      documentType: bankInfo.documentType,
      documentNumber: bankInfo.documentNumber,
      bankName: bankInfo.bankName,
      accountType: bankInfo.accountType,
      accountNumber: bankInfo.accountNumber,
      contactEmail: bankInfo.contactEmail,
      contactPhone: bankInfo.contactPhone,
      created_at: bankInfo.created_at,
      updated_at: bankInfo.updated_at,
    };
  }
}
