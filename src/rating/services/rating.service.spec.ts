import { BadRequestException } from "@nestjs/common";
import { RatingService } from "./rating.service";
import { ContractStatus } from "../../contract/entities/contract.entity";
import { PaymentStatus } from "../../enums/paymentMethod.enum";

describe("RatingService create (v2)", () => {
  const reviewerId = 10;
  const revieweeId = 20;
  const contractId = "contract-1";

  const reviewer = { id: reviewerId };
  const reviewee = { id: revieweeId };

  const baseContract = {
    id: contractId,
    status: ContractStatus.COMPLETED,
    client: { id: reviewerId },
    provider: { id: revieweeId },
  };

  const createDto = {
    reviewerId,
    revieweeId,
    contractId,
    stars: 5,
    comment: "Buen servicio",
    category: "SERVICE",
  };

  const buildService = (overrides: {
    userRepository?: any;
    contractRepository?: any;
    ratingRepository?: any;
    paymentTransactionRepository?: any;
  } = {}) => {
    const ratingRepository = overrides.ratingRepository ?? {
      findOne: jest.fn().mockImplementation((query) => {
        if (query?.where?.id) {
          return {
            id: "rating-1",
            contract: baseContract,
            reviewer,
            reviewee,
          };
        }
        return null;
      }),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({
        ...value,
        id: "rating-1",
      })),
    };

    const userRepository = overrides.userRepository ?? {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === reviewerId) {
          return reviewer;
        }
        if (where.id === revieweeId) {
          return reviewee;
        }
        return null;
      }),
    };

    const contractRepository = overrides.contractRepository ?? {
      findOne: jest.fn().mockResolvedValue(baseContract),
    };

    const paymentTransactionRepository =
      overrides.paymentTransactionRepository ?? {
        findOne: jest.fn().mockResolvedValue({
          id: "payment-1",
          status: PaymentStatus.COMPLETED,
        }),
      };

    const service = new RatingService(
      ratingRepository,
      userRepository,
      {} as any,
      contractRepository,
      paymentTransactionRepository,
    );

    return { service, ratingRepository, userRepository, contractRepository };
  };

  it("creates rating when contract is completed and payment processed", async () => {
    const { service, ratingRepository } = buildService();

    const result = await service.create(createDto as any);

    expect(ratingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: baseContract,
        reviewer,
        reviewee,
      }),
    );
    expect(result.contract).toBe(baseContract);
  });

  it("fails if contract is not completed", async () => {
    const { service } = buildService({
      contractRepository: {
        findOne: jest.fn().mockResolvedValue({
          ...baseContract,
          status: ContractStatus.ACCEPTED,
        }),
      },
    });

    await expect(service.create(createDto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("fails if there is no processed payment", async () => {
    const { service } = buildService({
      paymentTransactionRepository: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.create(createDto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("fails if reviewer does not belong to the contract", async () => {
    const { service } = buildService({
      contractRepository: {
        findOne: jest.fn().mockResolvedValue({
          ...baseContract,
          client: { id: 999 },
          provider: { id: 998 },
        }),
      },
    });

    await expect(service.create(createDto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("fails if rating already exists for contract and reviewer", async () => {
    const { service } = buildService({
      ratingRepository: {
        findOne: jest.fn().mockImplementation((query) => {
          if (query?.where?.contract) {
            return {
              id: "rating-1",
              contract: baseContract,
              reviewer,
              reviewee,
            };
          }
          return null;
        }),
      },
    });

    await expect(service.create(createDto as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
