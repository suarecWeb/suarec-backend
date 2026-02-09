import { ContractService } from "./contract.service";
import { ContractStatus } from "./entities/contract.entity";

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
