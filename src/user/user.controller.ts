import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Query, Patch } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';
import { User } from './entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ type: PaginationDto })
  findAll(@Query() paginationDto: PaginationDto, @Req() req: ExpressRequest): Promise<PaginationResponse<User>> {
    console.log("Cookies en la solicitud:", req.cookies);
    console.log("Headers en la solicitud:", req.headers);
    return this.userService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  findOne(@Param('id') id: number, @Req() req: ExpressRequest) {
    console.log("Usuario autenticado:", req.user);
    return this.userService.findOne(+id);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get a user by email' })
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: ExpressRequest) {
    console.log("Usuario autenticado:", req.user);
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string, @Req() req: ExpressRequest) {
    console.log("Usuario autenticado:", req.user);
    return this.userService.remove(+id);
  }

  @Roles('ADMIN')
  @Get('companies')
  @ApiOperation({ summary: 'Get all company users with pagination' })
  @ApiQuery({ type: PaginationDto })
  findAllCompanies(@Query() paginationDto: PaginationDto, @Req() req: ExpressRequest): Promise<PaginationResponse<User>> {
    console.log("Cookies en la solicitud:", req.cookies);
    console.log("Headers en la solicitud:", req.headers);
    return this.userService.findAllCompanies(paginationDto);
  }

  // Endpoint para listar usuarios por empleador
  @Get('by-employer/:employerId')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get users by employer company ID' })
  @ApiParam({ name: 'employerId', description: 'Employer (Company) ID' })
  @ApiQuery({ type: PaginationDto })
  findByEmployer(
    @Param('employerId') employerId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResponse<User>> {
    return this.userService.findByEmployer(employerId, paginationDto);
  }

  // Endpoint para cambiar el empleador de un usuario
  @Patch(':id/change-employer')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Change user employer' })
  @ApiParam({ name: 'id', description: 'User ID' })
  changeEmployer(
    @Param('id') id: string,
    @Body('employerId') employerId: string | null
  ): Promise<User> {
    const updateDto: UpdateUserDto = { employerId };
    return this.userService.update(+id, updateDto);
  }

  // Endpoint para quitar un usuario de una empresa (quitar su empleador)
  @Delete(':id/employer')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Remove user from employer company' })
  @ApiParam({ name: 'id', description: 'User ID' })
  removeEmployer(@Param('id') id: string): Promise<User> {
    const updateDto: UpdateUserDto = { employerId: null };
    return this.userService.update(+id, updateDto);
  }
}