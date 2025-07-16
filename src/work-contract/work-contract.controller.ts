// src/work-contract/work-contract.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { WorkContractService } from "./services/work-contract.service";
import { CreateWorkContractDto } from "./dto/create-work-contract.dto";
import { UpdateWorkContractDto } from "./dto/update-work-contract.dto";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";
import { AuthGuard } from "../auth/guard/auth.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { WorkContract } from "./entities/work-contract.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";

@ApiTags("Work Contracts")
@Controller("work-contracts")
@UseGuards(AuthGuard, RolesGuard)
export class WorkContractController {
  constructor(private readonly workContractService: WorkContractService) {} // eslint-disable-line no-unused-vars

  @Post()
  @ApiOperation({ summary: "Create a new work contract" })
  @ApiResponse({
    status: 201,
    description: "Work contract created successfully",
  })
  async create(
    @Body() createWorkContractDto: CreateWorkContractDto,
  ): Promise<WorkContract> {
    return this.workContractService.create(createWorkContractDto);
  }

  @Roles("ADMIN")
  @Get()
  @ApiOperation({ summary: "Get all work contracts with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<WorkContract>> {
    return this.workContractService.findAll(paginationDto);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get work contracts for a specific user" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiQuery({ type: PaginationDto })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["client", "provider"],
    description: "Filter by role",
  })
  findByUser(
    @Param("userId") userId: string,
    @Query() paginationDto: PaginationDto,
    @Query("role") role?: "client" | "provider",
  ): Promise<PaginationResponse<WorkContract>> {
    return this.workContractService.findByUser(+userId, paginationDto, role);
  }

  @Get("user/:userId/history")
  @ApiOperation({ summary: "Get work history statistics for a user" })
  @ApiParam({ name: "userId", description: "User ID" })
  async getUserWorkHistory(@Param("userId") userId: string): Promise<{
    asClient: {
      total: number;
      completed: number;
      inProgress: number;
      totalSpent: number;
    };
    asProvider: {
      total: number;
      completed: number;
      inProgress: number;
      totalEarned: number;
    };
  }> {
    return this.workContractService.getUserWorkHistory(+userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a work contract by id" })
  @ApiParam({ name: "id", description: "Work Contract ID" })
  findOne(@Param("id") id: string): Promise<WorkContract> {
    return this.workContractService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a work contract" })
  @ApiParam({ name: "id", description: "Work Contract ID" })
  update(
    @Param("id") id: string,
    @Body() updateWorkContractDto: UpdateWorkContractDto,
  ): Promise<WorkContract> {
    return this.workContractService.update(id, updateWorkContractDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a work contract" })
  @ApiParam({ name: "id", description: "Work Contract ID" })
  async remove(@Param("id") id: string): Promise<{ message: string }> {
    await this.workContractService.remove(id);
    return { message: "Work contract deleted successfully" };
  }
}
