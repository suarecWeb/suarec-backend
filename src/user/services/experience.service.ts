import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Experience } from '../entities/experience.entity';
import { CreateExperienceDto } from '../dto/create-experience.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class ExperienceService {
  constructor(
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: number, createExperienceDto: CreateExperienceDto): Promise<Experience> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const experience = this.experienceRepository.create({
      ...createExperienceDto,
      user,
    });

    return this.experienceRepository.save(experience);
  }

  async findAllByUser(userId: number): Promise<Experience[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.experienceRepository.find({
      where: { user: { id: userId } },
      order: { startDate: 'DESC' },
    });
  }

  async update(id: string, updateExperienceDto: Partial<CreateExperienceDto>): Promise<Experience> {
    const experience = await this.experienceRepository.findOne({ where: { id } });
    if (!experience) {
      throw new NotFoundException(`Experience with ID ${id} not found`);
    }

    Object.assign(experience, updateExperienceDto);
    return this.experienceRepository.save(experience);
  }

  async remove(id: string): Promise<void> {
    const experience = await this.experienceRepository.findOne({ where: { id } });
    if (!experience) {
      throw new NotFoundException(`Experience with ID ${id} not found`);
    }

    await this.experienceRepository.remove(experience);
  }
} 