import { buildPeriodRanges, computeCancelRate } from "./stats.utils";

describe("stats.utils", () => {
  it("builds rolling week ranges", () => {
    const now = new Date("2024-01-08T00:00:00.000Z");
    const { from, to, previousFrom, previousTo } = buildPeriodRanges("week", now);

    expect(to?.toISOString()).toBe("2024-01-08T00:00:00.000Z");
    expect(from?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(previousTo?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(previousFrom?.toISOString()).toBe("2023-12-25T00:00:00.000Z");
  });

  it("computes cancel rate safely", () => {
    expect(computeCancelRate(0, 0)).toBe(0);
    expect(computeCancelRate(4, 1)).toBe(0.2);
  });
});
