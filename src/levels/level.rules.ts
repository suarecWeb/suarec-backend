import { ContractStatus } from "../contract/entities/contract.entity";
import { PaymentStatus } from "../enums/paymentMethod.enum";
import { LevelMetrics, SuarecLevel } from "./level.types";

export const PROCESSED_PAYMENT_STATUSES = [
  PaymentStatus.COMPLETED,
  // FINISHED is a temporary alias; migrate to COMPLETED-only in the future.
  PaymentStatus.FINISHED,
];

export function isPaymentProcessed(status: PaymentStatus): boolean {
  return PROCESSED_PAYMENT_STATUSES.includes(status);
}

export function isSuccessfulContract(
  contractStatus: ContractStatus | string | null | undefined,
  paymentStatuses: PaymentStatus[],
): boolean {
  if (contractStatus !== ContractStatus.COMPLETED) {
    return false;
  }

  if (!paymentStatuses || paymentStatuses.length === 0) {
    return false;
  }

  return paymentStatuses.some(isPaymentProcessed);
}

export function computeSuarecLevel(metrics: LevelMetrics): SuarecLevel {
  const { successfulContracts, ratingAvg, ratingCount, cancelRate } = metrics;
  const ratingAvailable = ratingAvg != null && ratingCount != null;

  const meetsCancelRate = (threshold: number) =>
    cancelRate == null || cancelRate <= threshold;

  const meetsRating = (minAvg: number, minCount: number) =>
    ratingAvailable &&
    Number(ratingAvg) >= minAvg &&
    Number(ratingCount) >= minCount;

  if (
    meetsRating(4.7, 25) &&
    successfulContracts >= 50 &&
    meetsCancelRate(0.05)
  ) {
    return SuarecLevel.ELITE;
  }

  if (
    meetsRating(4.5, 10) &&
    successfulContracts >= 20 &&
    meetsCancelRate(0.1)
  ) {
    return SuarecLevel.PROFESIONAL;
  }

  const meetsActivoRating = ratingAvailable ? meetsRating(4.3, 3) : true;
  if (successfulContracts >= 5 && meetsActivoRating && meetsCancelRate(0.2)) {
    return SuarecLevel.ACTIVO;
  }

  return SuarecLevel.NUEVO;
}
