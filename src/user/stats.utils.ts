export type StatsPeriod = "week" | "month" | "quarter" | "year" | "total";

export type GrowthState = "preparandote" | "creciendo" | "en_expansion";

export interface PeriodRange {
  from: Date | null;
  to: Date | null;
  previousFrom: Date | null;
  previousTo: Date | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildPeriodRanges(
  period: StatsPeriod,
  now: Date = new Date(),
): PeriodRange {
  if (period === "total") {
    return {
      from: null,
      to: null,
      previousFrom: null,
      previousTo: null,
    };
  }

  const dayCounts: Record<Exclude<StatsPeriod, "total">, number> = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };

  // Rolling window: last N days ending at "now".
  const days = dayCounts[period];
  const to = new Date(now);
  const from = new Date(now.getTime() - days * MS_PER_DAY);
  const previousTo = new Date(from);
  const previousFrom = new Date(from.getTime() - days * MS_PER_DAY);

  return { from, to, previousFrom, previousTo };
}

export function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function computeCancelRate(
  successful: number,
  cancelled: number,
): number {
  const total = successful + cancelled;
  if (total === 0) {
    return 0;
  }

  return Number((cancelled / total).toFixed(4));
}

export function computeGrowthState(
  current: { earnings_gross: number; contracts_successful: number },
  previous: { earnings_gross: number; contracts_successful: number },
): GrowthState {
  const lowContracts = current.contracts_successful < 5;
  const lowEarnings = current.earnings_gross <= 0;

  if (lowContracts && lowEarnings) {
    return "preparandote";
  }

  const earningsDelta = current.earnings_gross - previous.earnings_gross;
  const earningsGrowthRatio =
    previous.earnings_gross > 0
      ? earningsDelta / previous.earnings_gross
      : current.earnings_gross > 0
        ? 1
        : 0;

  const contractDelta =
    current.contracts_successful - previous.contracts_successful;

  if (earningsGrowthRatio >= 0.25 || earningsDelta >= 100000 || contractDelta >= 5) {
    return "en_expansion";
  }

  if (earningsGrowthRatio >= 0.1 || earningsDelta >= 20000 || contractDelta >= 2) {
    return "creciendo";
  }

  return "preparandote";
}
