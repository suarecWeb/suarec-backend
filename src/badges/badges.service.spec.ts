import { BadgesService } from "./badges.service";
import { SuarecLevel } from "../levels/level.types";

describe("BadgesService", () => {
  it("awards level badges idempotently", async () => {
    const badgeActivo = { id: "1", key: "LEVEL_ACTIVO" };
    const badgeProfesional = { id: "2", key: "LEVEL_PROFESIONAL" };

    const badgeRepository = {
      find: jest.fn().mockResolvedValue([badgeActivo, badgeProfesional]),
    };

    const userBadgeRepository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([{ badge: badgeActivo }])
        .mockResolvedValueOnce([
          { badge: badgeActivo },
          { badge: badgeProfesional },
        ]),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue([]),
    };

    const levelsService = {
      getUserLevel: jest
        .fn()
        .mockResolvedValue({ current_level: SuarecLevel.PROFESIONAL }),
    };

    const service = new BadgesService(
      badgeRepository as any,
      userBadgeRepository as any,
      levelsService as any,
    );

    await service.ensureLevelBadgesForUser(10);
    await service.ensureLevelBadgesForUser(10);

    expect(userBadgeRepository.save).toHaveBeenCalledTimes(1);
    const saved = userBadgeRepository.save.mock.calls[0][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].badge).toEqual(badgeProfesional);
  });

  it("returns catalog badges", async () => {
    const badges = [{ id: "1", name: "Usuario Activo" }];
    const badgeRepository = {
      find: jest.fn().mockResolvedValue(badges),
    };
    const userBadgeRepository = {};
    const levelsService = {};

    const service = new BadgesService(
      badgeRepository as any,
      userBadgeRepository as any,
      levelsService as any,
    );

    const result = await service.getCatalog();

    expect(result).toEqual(badges);
  });
});
