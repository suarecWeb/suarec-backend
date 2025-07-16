import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ExperienceService } from "../services/experience.service";
import { CreateExperienceDto } from "../dto/create-experience.dto";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";

@ApiTags("Experiences")
@Controller("experiences")
@UseGuards(AuthGuard, RolesGuard)
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Post()
  @ApiOperation({ summary: "Create a new experience" })
  @ApiResponse({ status: 201, description: "Experience created successfully" })
  async create(
    @Body() createExperienceDto: CreateExperienceDto,
    @Req() req: ExpressRequest,
  ) {
    const jwtUser = req.user as { id: number };
    return this.experienceService.create(jwtUser.id, createExperienceDto);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get all experiences for a user" })
  @ApiResponse({
    status: 200,
    description: "Return all experiences for the user",
  })
  async findAllByUser(@Param("userId") userId: string) {
    return this.experienceService.findAllByUser(+userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an experience" })
  @ApiResponse({ status: 200, description: "Experience updated successfully" })
  async update(
    @Param("id") id: string,
    @Body() updateExperienceDto: Partial<CreateExperienceDto>,
  ) {
    return this.experienceService.update(id, updateExperienceDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an experience" })
  @ApiResponse({ status: 200, description: "Experience deleted successfully" })
  async remove(@Param("id") id: string) {
    return this.experienceService.remove(id);
  }
}
