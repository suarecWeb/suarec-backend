import { PaymentService } from "./payment.service";
import { PaymentMethod, PaymentStatus } from "../../enums/paymentMethod.enum";
import { PlatformFeeStatus } from "../../fees/platform-fee-ledger.entity";

describe("PaymentService timestamps", () => {
  it("sets paid_at when marking payment COMPLETED", async () => {
    const payment = {
      id: "payment-1",
      status: PaymentStatus.PENDING,
      paid_at: null,
    };

    const paymentTransactionRepository = {
      findOne: jest.fn().mockResolvedValue(payment),
      save: jest.fn().mockImplementation(async (value) => value),
    };

    const service = new PaymentService(
      paymentTransactionRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.update(payment.id, {
      status: PaymentStatus.COMPLETED,
    });

    expect(result.paid_at).toBeInstanceOf(Date);
  });
});

describe("PaymentService confirmCashPayment", () => {
  const baseContract = {
    id: "contract-1",
    client: { id: 10 },
    provider: { id: 20 },
    currentPrice: 20000,
    totalPrice: 20000,
    initialPrice: 20000,
    suarecCommission: 7000,
  };

  it("creates payment transaction COMPLETED and fee ledger PENDING", async () => {
    const paymentTransactionRepository = {
      findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({
        ...value,
        id: "payment-1",
      })),
    };
    const contractRepository = {
      findOne: jest.fn().mockResolvedValue(baseContract),
    };
    const platformFeeLedgerRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({
        ...value,
        id: "ledger-1",
      })),
    };

    const service = new PaymentService(
      paymentTransactionRepository as any,
      {} as any,
      contractRepository as any,
      platformFeeLedgerRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.confirmCashPayment(baseContract.id, 10, [
      { name: "PERSON" },
    ]);

    expect(paymentTransactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.COMPLETED,
        payment_method: PaymentMethod.Cash,
      }),
    );
    expect(platformFeeLedgerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PlatformFeeStatus.PENDING,
        amount: 7000,
      }),
    );
    expect(result.feeDebtCreated).toBe(true);
    expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
  });

  it("is idempotent for payment and fee ledger", async () => {
    const existingPayment = {
      id: "payment-1",
      status: PaymentStatus.COMPLETED,
      paid_at: new Date("2024-01-01T00:00:00.000Z"),
      payment_method: PaymentMethod.Cash,
      payer: baseContract.client,
      payee: baseContract.provider,
      contract: baseContract,
    };
    const existingLedger = {
      id: "ledger-1",
      provider: baseContract.provider,
      contract: baseContract,
      amount: 7000,
      status: PlatformFeeStatus.PENDING,
    };

    const paymentTransactionRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingPayment),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({
        ...value,
        id: "payment-1",
      })),
    };
    const contractRepository = {
      findOne: jest.fn().mockResolvedValue(baseContract),
    };
    const platformFeeLedgerRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingLedger),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({
        ...value,
        id: "ledger-1",
      })),
    };

    const service = new PaymentService(
      paymentTransactionRepository as any,
      {} as any,
      contractRepository as any,
      platformFeeLedgerRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.confirmCashPayment(baseContract.id, 10, [{ name: "PERSON" }]);
    await service.confirmCashPayment(baseContract.id, 10, [{ name: "PERSON" }]);

    expect(paymentTransactionRepository.create).toHaveBeenCalledTimes(1);
    expect(platformFeeLedgerRepository.create).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite paid_at when payment is already completed", async () => {
    const paidAt = new Date("2024-01-01T00:00:00.000Z");
    const existingPayment = {
      id: "payment-1",
      status: PaymentStatus.COMPLETED,
      paid_at: paidAt,
      payment_method: PaymentMethod.Cash,
      payer: baseContract.client,
      payee: baseContract.provider,
      contract: baseContract,
    };

    const paymentTransactionRepository = {
      findOne: jest.fn().mockResolvedValue(existingPayment),
      save: jest.fn(),
    };
    const contractRepository = {
      findOne: jest.fn().mockResolvedValue(baseContract),
    };
    const platformFeeLedgerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: "ledger-1",
        provider: baseContract.provider,
        contract: baseContract,
      }),
      save: jest.fn(),
    };

    const service = new PaymentService(
      paymentTransactionRepository as any,
      {} as any,
      contractRepository as any,
      platformFeeLedgerRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.confirmCashPayment(baseContract.id, 10, [{ name: "PERSON" }]);

    expect(paymentTransactionRepository.save).not.toHaveBeenCalled();
    expect(existingPayment.paid_at).toBe(paidAt);
  });
});
