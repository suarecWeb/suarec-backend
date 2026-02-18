import { SuarecLevel } from "./level.types";
import {
  buildNextGoal,
  buildRequirements,
  computeProgressPct,
} from "./levels.utils";

describe("levels utils", () => {
  it("builds requirement results for Activo target", () => {
    const metrics = {
      successfulContracts: 3,
      ratingAvg: 4.0,
      ratingCount: 1,
      cancelRate: 0.1,
    };

    const requirements = buildRequirements(metrics, SuarecLevel.ACTIVO);

    expect(requirements).toEqual([
      { key: "successfulContracts", current: 3, target: 5, pass: false },
      { key: "ratingAvg", current: 4.0, target: 4.3, pass: false },
      { key: "ratingCount", current: 1, target: 3, pass: false },
      { key: "cancelRate", current: 0.1, target: 0.2, pass: true },
    ]);
  });

  it("computes progress from Nuevo to Activo", () => {
    const metrics = {
      successfulContracts: 2,
      ratingAvg: 4.0,
      ratingCount: 1,
      cancelRate: 0.1,
    };

    const progress = computeProgressPct(metrics, SuarecLevel.NUEVO);

    expect(progress).toBeCloseTo(66.59, 2);
  });

  it("computes progress from Activo to Profesional", () => {
    const metrics = {
      successfulContracts: 10,
      ratingAvg: 4.6,
      ratingCount: 12,
      cancelRate: 0.16,
    };

    const progress = computeProgressPct(metrics, SuarecLevel.ACTIVO);

    expect(progress).toBe(62.5);
  });

  it("returns full progress for Elite", () => {
    const metrics = {
      successfulContracts: 100,
      ratingAvg: 4.9,
      ratingCount: 40,
      cancelRate: 0.01,
    };

    const progress = computeProgressPct(metrics, SuarecLevel.ELITE);

    expect(progress).toBe(100);
  });

  it("prioritizes successful contracts as next goal", () => {
    const metrics = {
      successfulContracts: 10,
      ratingAvg: 4.2,
      ratingCount: 3,
      cancelRate: 0.05,
    };

    const nextGoal = buildNextGoal(metrics, SuarecLevel.PROFESIONAL);

    expect(nextGoal.key).toBe("successfulContracts");
    expect(nextGoal.remaining).toBe(10);
    expect(nextGoal.pct).toBe(50);
  });

  it("chooses rating average when higher priorities are satisfied", () => {
    const metrics = {
      successfulContracts: 20,
      ratingAvg: 4.2,
      ratingCount: 10,
      cancelRate: 0.05,
    };

    const nextGoal = buildNextGoal(metrics, SuarecLevel.PROFESIONAL);

    expect(nextGoal.key).toBe("ratingAvg");
    expect(nextGoal.remaining).toBeCloseTo(0.3, 2);
  });

  it("falls back to maintain when there is no next level", () => {
    const metrics = {
      successfulContracts: 60,
      ratingAvg: 4.9,
      ratingCount: 30,
      cancelRate: 0.01,
    };

    const nextGoal = buildNextGoal(metrics, null);

    expect(nextGoal.key).toBe("maintain");
    expect(nextGoal.pct).toBe(100);
    expect(nextGoal.target).toBeNull();
  });
});
