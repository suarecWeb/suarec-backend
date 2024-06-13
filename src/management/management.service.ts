import { Injectable } from '@nestjs/common';
import { CreateManagementDto } from './dto/create-management.dto';
import { UpdateManagementDto } from './dto/update-management.dto';

@Injectable()
export class ManagementService {
  create(createManagementDto: CreateManagementDto) {
    return 'This action adds a new management';
  }

  findAll() {
    return `This action returns all management`;
  }

  findOne(id: number) {
    return `This action returns a #${id} management`;
  }

  update(id: number, updateManagementDto: UpdateManagementDto) {
    return `This action updates a #${id} management`;
  }

  remove(id: number) {
    return `This action removes a #${id} management`;
  }
}
