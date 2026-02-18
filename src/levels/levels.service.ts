import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contract, ContractStatus } from "../contract/entities/contract.entity";
import { PaymentTransaction } from "../payment/entities/payment-transaction.entity";
import { User } from "../user/entities/user.entity";
import {
  PROCESSED_PAYMENT_STATUSES,
  computeSuarecLevel,
} from "./level.rules";
import { LevelMetrics } from "./level.types";
import {
  StatsPeriod,
  buildPeriodRanges,
  computeCancelRate,
  toIsoOrNull,
} from "../user/stats.utils";
import {
  buildRequirements,
  buildNextGoal,
  buildRecommendedAction,
  computeProgressPct,
  getNextLevel,
} from "./levels.utils";

@Injectable()
export class LevelsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getUserLevel(userId: number, period?: string) {
    const normalizedPeriod = this.normalizeStatsPeriod(period);
    const range = buildPeriodRanges(normalizedPeriod);
    const useRange = Boolean(range.from && range.to);

    const successfulQuery = this.contractRepository
      .createQueryBuilder("contract")
      .select("COUNT(contract.id)", "successfulContracts")
      .where("contract.providerId = :userId", { userId })
      .andWhere("contract.status = :status", {
        status: ContractStatus.COMPLETED,
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("1")
          .from(PaymentTransaction, "payment")
          .where("payment.contractId = contract.id")
          .andWhere("payment.status IN (:...processedStatuses)")
          .getQuery();
        return `EXISTS ${subQuery}`;
      })
      .setParameter("processedStatuses", PROCESSED_PAYMENT_STATUSES);

    if (useRange) {
      successfulQuery.andWhere(
        "COALESCE(contract.completed_at, contract.\"updatedAt\") BETWEEN :from AND :to",
        { from: range.from, to: range.to },
      );
    }

    const cancelledQuery = this.contractRepository
      .createQueryBuilder("contract")
      .select("COUNT(contract.id)", "cancelledContracts")
      .where("contract.providerId = :userId", { userId })
      .andWhere("contract.status = :status", { status: ContractStatus.CANCELLED });

    if (useRange) {
      cancelledQuery.andWhere(
        "COALESCE(contract.cancelled_at, contract.\"updatedAt\") BETWEEN :from AND :to",
        { from: range.from, to: range.to },
      );
    }

    const [successfulResult, cancelledResult, userRatings] =
      await Promise.all([
        successfulQuery.getRawOne(),
        cancelledQuery.getRawOne(),
        this.usersRepository
          .createQueryBuilder("user")
          .select(["user.average_rating", "user.total_ratings"])
          .where("user.id = :userId", { userId })
          .getRawOne(),
      ]);

    const successfulContracts = Number(
      successfulResult?.successfulContracts ?? 0,
    );
    const cancelledContracts = Number(
      cancelledResult?.cancelledContracts ?? 0,
    );
    const ratingAvg = Number(userRatings?.user_average_rating ?? 0);
    const ratingCount = Number(userRatings?.user_total_ratings ?? 0);
    const cancelRate = computeCancelRate(
      successfulContracts,
      cancelledContracts,
    );

    const metrics: LevelMetrics = {
      successfulContracts,
      ratingAvg,
      ratingCount,
      cancelRate,
    };

    const currentLevel = computeSuarecLevel(metrics);
    const nextLevel = getNextLevel(currentLevel);
    const requirements = buildRequirements(metrics, nextLevel);
    const nextGoal = buildNextGoal(metrics, nextLevel);
    const recommendedAction = buildRecommendedAction(nextGoal.key);

    return {
      userId,
      period: normalizedPeriod,
      current_period: {
        from: toIsoOrNull(range.from),
        to: toIsoOrNull(range.to),
      },
      metrics: {
        successfulContracts,
        cancelledContracts,
        cancelRate,
        ratingAvg,
        ratingCount,
      },
      current_level: currentLevel,
      next_level: nextLevel,
      requirements,
      next_goal: nextGoal,
      recommended_action: recommendedAction,
      progress_pct: computeProgressPct(metrics, currentLevel),
      missing_requirements: requirements
        .filter((requirement) => !requirement.pass)
        .map((requirement) => requirement.key),
    };
  }

  private normalizeStatsPeriod(value?: string): StatsPeriod {
    const period = (value || "month").toLowerCase();
    const allowed: StatsPeriod[] = ["week", "month", "quarter", "year", "total"];
    if (!allowed.includes(period as StatsPeriod)) {
      throw new BadRequestException(
        `Invalid period "${value}". Use week|month|quarter|year|total.`,
      );
    }
    return period as StatsPeriod;
  }
}
