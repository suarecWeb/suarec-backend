import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { AuthGuard } from "../auth/guard/auth.guard";
import { BadgesService } from "./badges.service";

@ApiTags("Badges")
@Controller()
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Public()
  @Get("badges/catalog")
  @ApiOperation({ summary: "Get badges catalog" })
  @ApiResponse({
    status: 200,
    description: "Badges catalog retrieved successfully",
  })
  async getCatalog() {
    return this.badgesService.getCatalog();
  }

  @UseGuards(AuthGuard)
  @Get("users/me/badges")
  @ApiOperation({ summary: "Get badges for current user" })
  @ApiResponse({
    status: 200,
    description: "User badges retrieved successfully",
  })
  async getMyBadges(@Request() req) {
    await this.badgesService.ensureLevelBadgesForUser(req.user.id);
    return this.badgesService.getUserBadges(req.user.id);
  }
}
