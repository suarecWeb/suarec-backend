import { createHash } from "crypto";
import { ContractService } from "./contract.service";
import { ContractStatus } from "./entities/contract.entity";
import { PaymentStatus } from "../enums/paymentMethod.enum";
import {
  BalanceTransactionStatus,
  BalanceTransactionType,
} from "../user/entities/balance-transaction.entity";

describe("ContractService completion credit flow", () => {
  const contractId = "contract-paid-1";
  const otpCode = "1234";

  const hashOtp = (id: string, code: string) =>
    createHash("sha256").update(`${id}:${code}`).digest("hex");

  const buildHarness = (options?: { failBalanceSave?: boolean }) => {
    const contractState: any = {
      id: contractId,
      status: ContractStatus.ACCEPTED,
      otpVerified: false,
      otpVerifiedAt: null,
      completedAt: null,
      cancelledAt: null,
      currentPrice: 20000,
      totalPrice: 20000,
      initialPrice: 20000,
      agreedDate: new Date(Date.now() - 86400000),
      agreedTime: "00:00",
      deleted_at: null,
      client: { id: 10, email: "client@example.com" },
      provider: { id: 20, email: "provider@example.com" },
      publication: { title: "Servicio test" },
    };

    const providerState: any = {
      id: 20,
      debit_balance: 0,
      credit_balance: 0,
    };

    const otpState: any = {
      id: "otp-1",
      code: null,
      codeHash: hashOtp(contractId, otpCode),
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    const approvedPayments: any[] = [
      {
        id: "payment-1",
        status: PaymentStatus.FINISHED,
        paid_at: new Date(),
        wompi_response: null,
      },
    ];

    const balanceMovements: any[] = [];

    const contractRepoInTx = {
      findOne: jest.fn().mockImplementation(async () => ({ ...contractState })),
      save: jest.fn().mockImplementation(async (value) => {
        Object.assign(contractState, value);
        return { ...contractState };
      }),
    };

    const otpRepoInTx = {
      findOne: jest
        .fn()
        .mockImplementation(async () => (otpState.isUsed ? null : { ...otpState })),
      save: jest.fn().mockImplementation(async (value) => {
        Object.assign(otpState, value);
        return { ...otpState };
      }),
    };

    const paymentRepoInTx = {
      find: jest.fn().mockResolvedValue(approvedPayments),
    };

    const userRepoInTx = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.id !== providerState.id) {
          return null;
        }
        return { ...providerState };
      }),
      update: jest.fn().mockImplementation(async (_id, payload) => {
        if (typeof payload?.credit_balance !== "undefined") {
          providerState.credit_balance = Number(payload.credit_balance);
        }
      }),
    };

    const balanceRepoInTx = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        return (
          balanceMovements.find(
            (movement) =>
              movement.contract?.id === where?.contract?.id &&
              movement.user?.id === where?.user?.id &&
              movement.type === where?.type,
          ) || null
        );
      }),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => {
        if (options?.failBalanceSave) {
          throw new Error("balance_write_failed");
        }
        const saved = {
          id: `movement-${balanceMovements.length + 1}`,
          ...value,
        };
        balanceMovements.push(saved);
        return saved;
      }),
    };

    const txManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        switch (entity?.name) {
          case "Contract":
            return contractRepoInTx;
          case "ContractOTP":
            return otpRepoInTx;
          case "PaymentTransaction":
            return paymentRepoInTx;
          case "User":
            return userRepoInTx;
          case "BalanceTransaction":
            return balanceRepoInTx;
          default:
            return {};
        }
      }),
    };

    const transaction = jest.fn().mockImplementation(async (callback) => {
      const snapshot = {
        contractState: { ...contractState },
        providerState: { ...providerState },
        otpState: { ...otpState },
        balanceMovements: balanceMovements.map((movement) => ({ ...movement })),
      };

      try {
        return await callback(txManager);
      } catch (error) {
        Object.assign(contractState, snapshot.contractState);
        Object.assign(providerState, snapshot.providerState);
        Object.assign(otpState, snapshot.otpState);
        balanceMovements.splice(0, balanceMovements.length, ...snapshot.balanceMovements);
        throw error;
      }
    });

    const contractRepository = {
      manager: { transaction },
    };

    const otpRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const paymentService = {
      findByContract: jest.fn().mockResolvedValue(approvedPayments),
    };

    const emailService = {
      sendContractNotification: jest.fn().mockResolvedValue(undefined),
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
      emailService as any,
      paymentService as any,
      {} as any,
      pushService as any,
    );

    return {
      service,
      contractState,
      providerState,
      otpState,
      approvedPayments,
      balanceMovements,
      contractRepoInTx,
      otpRepoInTx,
      paymentRepoInTx,
      userRepoInTx,
      balanceRepoInTx,
      pushService,
    };
  };

  it("verify-otp válido crea movement payment_completed_credit e incrementa credit_balance", async () => {
    const harness = buildHarness();

    const result = await harness.service.verifyContractOTP(contractId, otpCode, 20);

    expect(result.isValid).toBe(true);
    expect(result.contract.status).toBe(ContractStatus.COMPLETED);
    expect(result.contract.otpVerified).toBe(true);
    expect(harness.balanceMovements).toHaveLength(1);
    expect(harness.balanceMovements[0]).toEqual(
      expect.objectContaining({
        type: BalanceTransactionType.PAYMENT_COMPLETED_CREDIT,
        status: BalanceTransactionStatus.COMPLETED,
        amount: 20000,
      }),
    );
    expect(harness.providerState.credit_balance).toBe(20000);
  });

  it("verify-otp repetido no duplica crédito", async () => {
    const harness = buildHarness();

    await harness.service.verifyContractOTP(contractId, otpCode, 20);
    await expect(
      harness.service.verifyContractOTP(contractId, otpCode, 20),
    ).rejects.toBeDefined();

    expect(harness.balanceMovements).toHaveLength(1);
    expect(harness.providerState.credit_balance).toBe(20000);
  });

  it("si falla escritura de balance, hace rollback del contrato", async () => {
    const harness = buildHarness({ failBalanceSave: true });

    await expect(
      harness.service.verifyContractOTP(contractId, otpCode, 20),
    ).rejects.toThrow("balance_write_failed");

    expect(harness.contractState.status).toBe(ContractStatus.ACCEPTED);
    expect(harness.contractState.otpVerified).toBe(false);
    expect(harness.otpState.isUsed).toBe(false);
    expect(harness.providerState.credit_balance).toBe(0);
    expect(harness.balanceMovements).toHaveLength(0);
  });

  it("/complete también acredita usando la misma lógica", async () => {
    const harness = buildHarness();

    const result = await harness.service.completeContract(contractId, 20);

    expect(result.status).toBe(ContractStatus.COMPLETED);
    expect(harness.balanceMovements).toHaveLength(1);
    expect(harness.balanceMovements[0].type).toBe(
      BalanceTransactionType.PAYMENT_COMPLETED_CREDIT,
    );
    expect(harness.providerState.credit_balance).toBe(20000);
  });
});
