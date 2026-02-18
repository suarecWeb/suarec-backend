import { ContractStatus } from "../contract/entities/contract.entity";
import { PaymentStatus } from "../enums/paymentMethod.enum";
import {
  computeSuarecLevel,
  isPaymentProcessed,
  isSuccessfulContract,
} from "./level.rules";
import { SuarecLevel } from "./level.types";

describe("level rules", () => {
  it("treats PaymentStatus.FINISHED as processed", () => {
    expect(isPaymentProcessed(PaymentStatus.FINISHED)).toBe(true);
  });

  it("does not treat COMPLETED without processed payments as successful", () => {
    expect(
      isSuccessfulContract(ContractStatus.COMPLETED, [PaymentStatus.PENDING]),
    ).toBe(false);
  });

  it("computes Nuevo with boundary values", () => {
    const level = computeSuarecLevel({ successfulContracts: 0 });
    expect(level).toBe(SuarecLevel.NUEVO);
  });

  it("computes Activo with boundary values", () => {
    const level = computeSuarecLevel({
      successfulContracts: 5,
      ratingAvg: 4.3,
      ratingCount: 3,
      cancelRate: 0.2,
    });
    expect(level).toBe(SuarecLevel.ACTIVO);
  });

  it("computes Profesional with boundary values", () => {
    const level = computeSuarecLevel({
      successfulContracts: 20,
      ratingAvg: 4.5,
      ratingCount: 10,
      cancelRate: 0.1,
    });
    expect(level).toBe(SuarecLevel.PROFESIONAL);
  });

  it("computes Elite with boundary values", () => {
    const level = computeSuarecLevel({
      successfulContracts: 50,
      ratingAvg: 4.7,
      ratingCount: 25,
      cancelRate: 0.05,
    });
    expect(level).toBe(SuarecLevel.ELITE);
  });
});
