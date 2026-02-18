import { ContractService } from "./contract.service";
import { ContractStatus } from "./entities/contract.entity";
import { PaymentStatus } from "../enums/paymentMethod.enum";
import { createHash } from "crypto";

describe("ContractService timestamps", () => {
  const buildService = (contract: any) => {
    const contractRepository = {
      findOne: jest.fn().mockResolvedValue(contract),
      save: jest.fn().mockImplementation(async (value) => value),
    };

    const emailService = {
      sendContractNotification: jest.fn().mockResolvedValue(undefined),
    };

    const paymentService = {
      findByContract: jest.fn().mockResolvedValue([]),
    };

    const pushService = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ContractService(
      contractRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      emailService as any,
      paymentService as any,
      {} as any,
      pushService as any,
    );

    return { service, contractRepository };
  };

  it("sets completedAt when completing a contract", async () => {
    const contract = {
      id: "contract-1",
      status: ContractStatus.ACCEPTED,
      provider: { id: 2, name: "Provider" },
      client: { id: 1, email: "client@example.com" },
      publication: { title: "Test" },
      agreedDate: new Date(Date.now() - 86400000),
      agreedTime: "00:00",
      deleted_at: null,
      completedAt: null,
    };

    const { service } = buildService(contract);

    const result = await service.completeContract(contract.id, 2);

    expect(result.status).toBe(ContractStatus.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("sets cancelledAt when cancelling a contract", async () => {
    const contract = {
      id: "contract-2",
      status: ContractStatus.ACCEPTED,
      provider: { id: 2 },
      client: { id: 1 },
      agreedDate: new Date(Date.now() + 86400000),
      agreedTime: "00:00",
      deleted_at: null,
      cancelledAt: null,
    };

    const { service } = buildService(contract);
    jest.spyOn(service, "isPenaltyRequired").mockReturnValue(false);

    const result = await service.cancelContract(contract.id, 1);

    expect(result.status).toBe(ContractStatus.CANCELLED);
    expect(result.cancelledAt).toBeInstanceOf(Date);
  });
});

describe("ContractService OTP flow", () => {
  const hashOtp = (contractId: string, otpCode: string) =>
    createHash("sha256").update(`${contractId}:${otpCode}`).digest("hex");

  it("allows client to generate 4-digit OTP when contract is paid", async () => {
    const contract = {
      id: "contract-paid-1",
      status: ContractStatus.ACCEPTED,
      client: { id: 1 },
      provider: { id: 2 },
      publication: { title: "Servicio test" },
      otpVerified: false,
      cancelledAt: null,
    };

    const contractRepository = {
      findOne: jest.fn().mockResolvedValue(contract),
      manager: {},
    };
    const otpRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => value),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const paymentService = {
      findByContract: jest.fn().mockResolvedValue([
        {
          id: "payment-1",
          status: PaymentStatus.FINISHED,
          paid_at: new Date(),
          wompi_response: null,
        },
      ]),
    };
    const pushService = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ContractService(
      contractRepository as any,
      {} as any,
      otpRepository as any,
      {} as any,
      {} as any,
      {} as any,
      paymentService as any,
      {} as any,
      pushService as any,
    );

    const result = await service.generateContractOTP(contract.id, 1, 4);

    expect(result.contractId).toBe(contract.id);
    expect(result.otpLength).toBe(4);
    expect(result.otpCode).toMatch(/^\d{4}$/);
    expect(otpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: null,
        codeHash: expect.any(String),
        otpLength: 4,
        attempts: 0,
      }),
    );
    expect(pushService.sendToUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        title: "Cliente generó código de verificación",
      }),
    );
  });

  it("verifies OTP by provider and completes contract in transaction", async () => {
    const otpCode = "1234";
    const contractId = "contract-paid-2";
    const now = new Date();
    const contract = {
      id: contractId,
      status: ContractStatus.ACCEPTED,
      otpVerified: false,
      otpVerifiedAt: null,
      completedAt: null,
      cancelledAt: null,
      client: { id: 10 },
      provider: { id: 20 },
      publication: { title: "Servicio test 2" },
    };

    const contractRepoInTx = {
      findOne: jest.fn().mockResolvedValue({ ...contract }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const otpRepoInTx = {
      findOne: jest.fn().mockResolvedValue({
        id: "otp-1",
        code: null,
        codeHash: hashOtp(contractId, otpCode),
        attempts: 0,
        maxAttempts: 5,
        isUsed: false,
        expiresAt: new Date(now.getTime() + 60_000),
      }),
      save: jest.fn().mockImplementation(async (value) => value),
    };

    const transactionManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity?.name === "Contract") {
          return contractRepoInTx;
        }
        if (entity?.name === "ContractOTP") {
          return otpRepoInTx;
        }
        return {};
      }),
    };

    const contractRepository = {
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(async (cb) => cb(transactionManager)),
      },
    };

    const otpRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const paymentService = {
      findByContract: jest.fn().mockResolvedValue([
        {
          id: "payment-finished",
          status: PaymentStatus.FINISHED,
          paid_at: new Date(),
          wompi_response: null,
        },
      ]),
    };
    const pushService = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ContractService(
      contractRepository as any,
      {} as any,
      otpRepository as any,
      {} as any,
      {} as any,
      {} as any,
      paymentService as any,
      {} as any,
      pushService as any,
    );

    const result = await service.verifyContractOTP(contractId, otpCode, 20);

    expect(result.isValid).toBe(true);
    expect(result.contract.status).toBe(ContractStatus.COMPLETED);
    expect(result.contract.otpVerified).toBe(true);
    expect(contractRepoInTx.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ContractStatus.COMPLETED,
        otpVerified: true,
      }),
    );
    expect(pushService.sendToUser).toHaveBeenCalledTimes(2);
  });
});
