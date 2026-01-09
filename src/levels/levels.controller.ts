import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/guard/auth.guard";
import { LevelsService } from "./levels.service";

@ApiTags("Suarec Levels")
@Controller("users")
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get("me/level")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get current user SUAREC level" })
  @ApiQuery({
    name: "period",
    required: false,
    description: "week|month|quarter|year|total (default: month)",
  })
  @ApiResponse({
    status: 200,
    description: "User level data retrieved successfully",
  })
  async getMyLevel(@Request() req, @Query("period") period?: string) {
    return this.levelsService.getUserLevel(req.user.id, period);
  }
}
