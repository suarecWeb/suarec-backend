// src/rating/rating.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { RatingService } from "./services/rating.service";
import { CreateRatingDto } from "./dto/create-rating.dto";
import { UpdateRatingDto } from "./dto/update-rating.dto";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";
import { AuthGuard } from "../auth/guard/auth.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { Rating } from "./entities/rating.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";

@ApiTags("Ratings")
@Controller("ratings")
@UseGuards(AuthGuard, RolesGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: "Create a new rating" })
  @ApiResponse({ status: 201, description: "Rating created successfully" })
  async create(
    @Body() createRatingDto: CreateRatingDto,
    @Req() req: ExpressRequest,
  ): Promise<Rating> {
    console.log("Usuario autenticado:", req.user);
    return this.ratingService.create(createRatingDto);
  }

  @Roles("ADMIN")
  @Get()
  @ApiOperation({ summary: "Get all ratings with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Req() req: ExpressRequest,
  ): Promise<PaginationResponse<Rating>> {
    console.log("Cookies en la solicitud:", req.cookies);
    console.log("Headers en la solicitud:", req.headers);
    return this.ratingService.findAll(paginationDto);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get ratings for a specific user" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiQuery({ type: PaginationDto })
  findByUser(
    @Param("userId") userId: string,
    @Query() paginationDto: PaginationDto,
    @Req() req: ExpressRequest,
  ): Promise<PaginationResponse<Rating>> {
    console.log("Usuario autenticado:", req.user);
    return this.ratingService.findByUser(+userId, paginationDto);
  }

  @Get("user/:userId/stats")
  @ApiOperation({ summary: "Get rating statistics for a user" })
  @ApiParam({ name: "userId", description: "User ID" })
  async getUserRatingStats(
    @Param("userId") userId: string,
    @Req() req: ExpressRequest,
  ): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { [key: number]: number };
    categoryStats: { [category: string]: { average: number; count: number } };
  }> {
    console.log("Usuario autenticado:", req.user);
    return this.ratingService.getUserRatingStats(+userId);
  }

  @Get("ready-to-rate")
  @ApiOperation({ summary: "Get contracts ready for rating" })
  async getContractsReadyForRating(@Req() req: ExpressRequest): Promise<any[]> {
    console.log("Usuario autenticado:", req.user);
    const userId = (req.user as any).id;
    return this.ratingService.getContractsReadyForRating(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a rating by id" })
  @ApiParam({ name: "id", description: "Rating ID" })
  findOne(
    @Param("id") id: string,
    @Req() req: ExpressRequest,
  ): Promise<Rating> {
    console.log("Usuario autenticado:", req.user);
    return this.ratingService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a rating" })
  @ApiParam({ name: "id", description: "Rating ID" })
  update(
    @Param("id") id: string,
    @Body() updateRatingDto: UpdateRatingDto,
    @Req() req: ExpressRequest,
  ): Promise<Rating> {
    console.log("Usuario autenticado:", req.user);
    return this.ratingService.update(id, updateRatingDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a rating" })
  @ApiParam({ name: "id", description: "Rating ID" })
  async remove(
    @Param("id") id: string,
    @Req() req: ExpressRequest,
  ): Promise<{ message: string }> {
    console.log("Usuario autenticado:", req.user);
    await this.ratingService.remove(id);
    return { message: "Rating deleted successfully" };
  }
}
