import { LevelsService } from "./levels.service";

const createQueryBuilder = (rawResult: Record<string, unknown>) => {
  const subQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue("SELECT 1"),
  };

  const builder: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn((arg: any) => {
      if (typeof arg === "function") {
        arg(builder);
      }
      return builder;
    }),
    setParameter: jest.fn().mockReturnThis(),
    subQuery: jest.fn().mockReturnValue(subQueryBuilder),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };

  return builder;
};

describe("LevelsService", () => {
  it("builds the user level response", async () => {
    const successfulBuilder = createQueryBuilder({
      successfulContracts: 10,
    });
    const cancelledBuilder = createQueryBuilder({
      cancelledContracts: 2,
    });
    const userBuilder = createQueryBuilder({
      user_average_rating: 4.6,
      user_total_ratings: 12,
    });

    const contractRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(successfulBuilder)
        .mockReturnValueOnce(cancelledBuilder),
    };
    const userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(userBuilder),
    };

    const service = new LevelsService(
      contractRepository as any,
      userRepository as any,
    );

    const result = await service.getUserLevel(42, "month");

    expect(result.userId).toBe(42);
    expect(result.period).toBe("month");
    expect(result.metrics.successfulContracts).toBe(10);
    expect(result.metrics.cancelledContracts).toBe(2);
    expect(result.metrics.ratingAvg).toBe(4.6);
    expect(result.metrics.ratingCount).toBe(12);
    expect(result.current_level).toBe("Activo");
    expect(result.next_level).toBe("Profesional");
    expect(result.next_goal).toMatchObject({
      key: "successfulContracts",
      target: 20,
      remaining: 10,
      pct: 50,
    });
    expect(result.recommended_action).toMatchObject({
      cta_key: "GET_MORE_CONTRACTS",
      deep_link: "suarec://contracts",
    });
    expect(result.progress_pct).toBe(62.5);
    expect(result.missing_requirements).toEqual([
      "successfulContracts",
      "cancelRate",
    ]);
    expect(result.requirements).toHaveLength(4);
  });
});
