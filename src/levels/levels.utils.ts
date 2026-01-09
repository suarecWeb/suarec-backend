import { LevelMetrics, SuarecLevel } from "./level.types";

export type RequirementKey =
  | "successfulContracts"
  | "ratingAvg"
  | "ratingCount"
  | "cancelRate";

export interface RequirementResult {
  key: RequirementKey;
  current: number;
  target: number;
  pass: boolean;
}

export type NextGoalKey = RequirementKey | "maintain";

export interface NextGoal {
  key: NextGoalKey;
  label: string;
  current: number | null;
  target: number | null;
  remaining: number | null;
  pct: number;
}

export interface RecommendedAction {
  cta_key: string;
  label: string;
  deep_link: string | null;
}

interface RequirementDefinition {
  key: RequirementKey;
  target: number;
  comparator: "gte" | "lte";
}

const LEVEL_REQUIREMENTS: Record<SuarecLevel, RequirementDefinition[]> = {
  [SuarecLevel.NUEVO]: [],
  [SuarecLevel.ACTIVO]: [
    { key: "successfulContracts", target: 5, comparator: "gte" },
    { key: "ratingAvg", target: 4.3, comparator: "gte" },
    { key: "ratingCount", target: 3, comparator: "gte" },
    { key: "cancelRate", target: 0.2, comparator: "lte" },
  ],
  [SuarecLevel.PROFESIONAL]: [
    { key: "successfulContracts", target: 20, comparator: "gte" },
    { key: "ratingAvg", target: 4.5, comparator: "gte" },
    { key: "ratingCount", target: 10, comparator: "gte" },
    { key: "cancelRate", target: 0.1, comparator: "lte" },
  ],
  [SuarecLevel.ELITE]: [
    { key: "successfulContracts", target: 50, comparator: "gte" },
    { key: "ratingAvg", target: 4.7, comparator: "gte" },
    { key: "ratingCount", target: 25, comparator: "gte" },
    { key: "cancelRate", target: 0.05, comparator: "lte" },
  ],
};

const REQUIREMENT_LABELS: Record<RequirementKey, string> = {
  successfulContracts: "Contratos exitosos",
  ratingAvg: "Promedio de calificacion",
  ratingCount: "Cantidad de calificaciones",
  cancelRate: "Tasa de cancelacion",
};

const NEXT_GOAL_PRIORITY: RequirementKey[] = [
  "successfulContracts",
  "ratingCount",
  "ratingAvg",
  "cancelRate",
];

export function getNextLevel(current: SuarecLevel): SuarecLevel | null {
  const levels = [
    SuarecLevel.NUEVO,
    SuarecLevel.ACTIVO,
    SuarecLevel.PROFESIONAL,
    SuarecLevel.ELITE,
  ];
  const index = levels.indexOf(current);
  if (index < 0 || index === levels.length - 1) {
    return null;
  }

  return levels[index + 1];
}

export function buildRequirements(
  metrics: LevelMetrics,
  targetLevel: SuarecLevel | null,
): RequirementResult[] {
  if (!targetLevel) {
    return [];
  }

  const definitions = LEVEL_REQUIREMENTS[targetLevel] || [];
  return definitions.map((definition) => {
    const current = getMetricValue(metrics, definition.key);
    const pass =
      definition.comparator === "gte"
        ? current >= definition.target
        : current <= definition.target;

    return {
      key: definition.key,
      current,
      target: definition.target,
      pass,
    };
  });
}

export function buildNextGoal(
  metrics: LevelMetrics,
  targetLevel: SuarecLevel | null,
): NextGoal {
  if (!targetLevel) {
    return buildMaintainGoal();
  }

  const requirements = LEVEL_REQUIREMENTS[targetLevel] || [];
  if (requirements.length === 0) {
    return buildMaintainGoal();
  }

  const detailByKey = new Map<RequirementKey, NextGoal>();
  for (const requirement of requirements) {
    const current = getMetricValue(metrics, requirement.key);
    const remaining = computeRemaining(requirement, current);
    const pct = roundTo(
      computeRequirementProgress(metrics, requirement),
      2,
    );

    detailByKey.set(requirement.key, {
      key: requirement.key,
      label: REQUIREMENT_LABELS[requirement.key],
      current,
      target: requirement.target,
      remaining,
      pct,
    });
  }

  for (const key of NEXT_GOAL_PRIORITY) {
    const detail = detailByKey.get(key);
    if (detail && detail.remaining != null && detail.remaining > 0) {
      return detail;
    }
  }

  return buildMaintainGoal();
}

export function buildRecommendedAction(key: NextGoalKey): RecommendedAction {
  switch (key) {
    case "successfulContracts":
      return {
        cta_key: "GET_MORE_CONTRACTS",
        label: "Consigue mas contratos",
        deep_link: "suarec://contracts",
      };
    case "ratingCount":
      return {
        cta_key: "ASK_FOR_RATINGS",
        label: "Pide calificaciones",
        deep_link: "suarec://ratings",
      };
    case "ratingAvg":
      return {
        cta_key: "IMPROVE_SERVICE_QUALITY",
        label: "Mejora tu calificacion",
        deep_link: "suarec://tips/quality",
      };
    case "cancelRate":
      return {
        cta_key: "REDUCE_CANCELLATIONS",
        label: "Reduce cancelaciones",
        deep_link: "suarec://tips/cancellations",
      };
    case "maintain":
    default:
      return {
        cta_key: "MAINTAIN_LEVEL",
        label: "Manten tu nivel",
        deep_link: null,
      };
  }
}

export function computeProgressPct(
  metrics: LevelMetrics,
  currentLevel: SuarecLevel,
): number {
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) {
    return 100;
  }

  const requirements = LEVEL_REQUIREMENTS[nextLevel] || [];
  if (requirements.length === 0) {
    return 0;
  }

  const total = requirements.reduce((sum, requirement) => {
    return sum + computeRequirementProgress(metrics, requirement);
  }, 0);

  return clamp(Number((total / requirements.length).toFixed(2)), 0, 100);
}

function computeRequirementProgress(
  metrics: LevelMetrics,
  requirement: RequirementDefinition,
): number {
  const current = getMetricValue(metrics, requirement.key);

  if (requirement.key === "cancelRate") {
    return current <= requirement.target ? 100 : 0;
  }

  if (requirement.target <= 0) {
    return 100;
  }

  return clamp((current / requirement.target) * 100, 0, 100);
}

function computeRemaining(
  requirement: RequirementDefinition,
  current: number,
): number {
  switch (requirement.key) {
    case "successfulContracts":
    case "ratingCount":
      return Math.max(0, requirement.target - current);
    case "ratingAvg":
      return current >= requirement.target
        ? 0
        : roundTo(requirement.target - current, 2);
    case "cancelRate":
      return current <= requirement.target
        ? 0
        : roundTo(current - requirement.target, 4);
    default:
      return 0;
  }
}

function getMetricValue(metrics: LevelMetrics, key: RequirementKey): number {
  switch (key) {
    case "successfulContracts":
      return Number(metrics.successfulContracts ?? 0);
    case "ratingAvg":
      return Number(metrics.ratingAvg ?? 0);
    case "ratingCount":
      return Number(metrics.ratingCount ?? 0);
    case "cancelRate":
      return Number(metrics.cancelRate ?? 0);
    default:
      return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildMaintainGoal(): NextGoal {
  return {
    key: "maintain",
    label: "Mantener nivel",
    current: null,
    target: null,
    remaining: null,
    pct: 100,
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
