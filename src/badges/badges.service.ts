import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Badge } from "./entities/badge.entity";
import { UserBadge } from "./entities/user-badge.entity";
import { LevelsService } from "../levels/levels.service";
import { SuarecLevel } from "../levels/level.types";
import { User } from "../user/entities/user.entity";

const LEVEL_BADGE_KEYS: Record<SuarecLevel, string[]> = {
  [SuarecLevel.NUEVO]: [],
  [SuarecLevel.ACTIVO]: ["LEVEL_ACTIVO"],
  [SuarecLevel.PROFESIONAL]: ["LEVEL_ACTIVO", "LEVEL_PROFESIONAL"],
  [SuarecLevel.ELITE]: [
    "LEVEL_ACTIVO",
    "LEVEL_PROFESIONAL",
    "LEVEL_ELITE",
  ],
};

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    private readonly levelsService: LevelsService,
  ) {}

  async getCatalog(): Promise<Badge[]> {
    return this.badgeRepository.find({ order: { name: "ASC" } });
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({
      where: { user: { id: userId } },
      relations: ["badge"],
      order: { awarded_at: "DESC" },
    });
  }

  async ensureLevelBadgesForUser(userId: number): Promise<void> {
    const levelResponse = await this.levelsService.getUserLevel(userId);
    const currentLevel = levelResponse.current_level as SuarecLevel;
    const badgeKeys = LEVEL_BADGE_KEYS[currentLevel] || [];

    if (badgeKeys.length === 0) {
      return;
    }

    const badges = await this.badgeRepository.find({
      where: { key: In(badgeKeys) },
    });

    const badgeByKey = new Map(badges.map((badge) => [badge.key, badge]));
    const missingKeys = badgeKeys.filter((key) => !badgeByKey.has(key));
    if (missingKeys.length > 0) {
      throw new InternalServerErrorException(
        `Missing seeded badges: ${missingKeys.join(", ")}`,
      );
    }

    const badgeIds = badges.map((badge) => badge.id);
    const existing = await this.userBadgeRepository.find({
      where: {
        user: { id: userId },
        badge: { id: In(badgeIds) },
      },
      relations: ["badge"],
    });

    const existingBadgeIds = new Set(
      existing.map((userBadge) => userBadge.badge?.id),
    );

    const toCreate = badges
      .filter((badge) => !existingBadgeIds.has(badge.id))
      .map((badge) =>
        this.userBadgeRepository.create({
          user: { id: userId } as User,
          badge,
        }),
      );

    if (toCreate.length > 0) {
      await this.userBadgeRepository.save(toCreate);
    }
  }
}
