import { Test, TestingModule } from '@nestjs/testing';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';

describe('ManagementController', () => {
  let controller: ManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManagementController],
      providers: [ManagementService],
    }).compile();

    controller = module.get<ManagementController>(ManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
