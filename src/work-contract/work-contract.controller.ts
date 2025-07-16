// src/work-contract/work-contract.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { WorkContractService } from './services/work-contract.service';
import { CreateWorkContractDto } from './dto/create-work-contract.dto';
import { UpdateWorkContractDto } from './dto/update-work-contract.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { AuthGuard } from '../auth/guard/auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';
import { WorkContract } from './entities/work-contract.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Work Contracts')
@Controller('work-contracts')
@UseGuards(AuthGuard, RolesGuard)
export class WorkContractController {
  constructor(private readonly workContractService: WorkContractService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new work contract' })
  @ApiResponse({ status: 201, description: 'Work contract created successfully' })
  async create(
    @Body() createWorkContractDto: CreateWorkContractDto,
    @Req() req: ExpressRequest
  ): Promise<WorkContract> {
    console.log("Usuario autenticado:", req.user);
    return this.workContractService.create(createWorkContractDto);
  }

  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all work contracts with pagination' })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Req() req: ExpressRequest
  ): Promise<PaginationResponse<WorkContract>> {
    console.log("Cookies en la solicitud:", req.cookies);
    console.log("Headers en la solicitud:", req.headers);
    return this.workContractService.findAll(paginationDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get work contracts for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ type: PaginationDto })
  @ApiQuery({ name: 'role', required: false, enum: ['client', 'provider'], description: 'Filter by role' })
  findByUser(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: 'client' | 'provider',
    @Req() req?: ExpressRequest
  ): Promise<PaginationResponse<WorkContract>> {
    console.log("Usuario autenticado:", req?.user);
    return this.workContractService.findByUser(+userId, paginationDto, role);
  }

  @Get('user/:userId/history')
  @ApiOperation({ summary: 'Get work history statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserWorkHistory(
    @Param('userId') userId: string,
    @Req() req: ExpressRequest
  ): Promise<{
    asClient: { total: number; completed: number; inProgress: number; totalSpent: number };
    asProvider: { total: number; completed: number; inProgress: number; totalEarned: number };
  }> {
    console.log("Usuario autenticado:", req.user);
    return this.workContractService.getUserWorkHistory(+userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work contract by id' })
  @ApiParam({ name: 'id', description: 'Work Contract ID' })
  findOne(
    @Param('id') id: string,
    @Req() req: ExpressRequest
  ): Promise<WorkContract> {
    console.log("Usuario autenticado:", req.user);
    return this.workContractService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a work contract' })
  @ApiParam({ name: 'id', description: 'Work Contract ID' })
  update(
    @Param('id') id: string,
    @Body() updateWorkContractDto: UpdateWorkContractDto,
    @Req() req: ExpressRequest
  ): Promise<WorkContract> {
    console.log("Usuario autenticado:", req.user);
    return this.workContractService.update(id, updateWorkContractDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a work contract' })
  @ApiParam({ name: 'id', description: 'Work Contract ID' })
  async remove(
    @Param('id') id: string,
    @Req() req: ExpressRequest
  ): Promise<{ message: string }> {
    console.log("Usuario autenticado:", req.user);
    await this.workContractService.remove(id);
    return { message: 'Work contract deleted successfully' };
  }
}