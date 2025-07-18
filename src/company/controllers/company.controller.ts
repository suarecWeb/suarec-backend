import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from "@nestjs/common";
import { CompanyService } from "../services/company.service";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";
import { UpdateCompanyLocationDto } from "../dto/update-company-location.dto";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { LocationGuard } from "../../auth/guard/location.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { Company } from "../entities/company.entity";
import { Public } from "../../auth/decorators/public.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { EmployeePaginationDto } from "../dto/employee-pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import {
  UpdateCheckInTimeDto,
  AttendanceStatsQueryDto,
} from "../dto/in-time.dto";
import {
  AddEmployeeDto,
  RemoveEmployeeDto,
} from "../dto/employee-management.dto";

@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {} // eslint-disable-line no-unused-vars

  @Post()
  @Public()
  @ApiOperation({ summary: "Create a new company" })
  @ApiResponse({ status: 201, description: "Company created successfully" })
  create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get all companies with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Company>> {
    return this.companyService.findAll(paginationDto);
  }

  @Get(":id")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get a company by id" })
  findOne(@Param("id") id: string): Promise<Company> {
    return this.companyService.findOne(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Update a company" })
  update(
    @Param("id") id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Delete a company" })
  remove(@Param("id") id: string): Promise<void> {
    return this.companyService.remove(id);
  }

  // Nuevos endpoints para gestionar empleados

  @Get(':id/employees')
  @Roles('ADMIN', 'BUSINESS')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all employees of a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiQuery({ type: EmployeePaginationDto })
  getEmployees(
    @Param('id') id: string,
    @Query() paginationDto: EmployeePaginationDto
  ): Promise<PaginationResponse<User>> {
    return this.companyService.getEmployees(id, paginationDto);
  }

  @Post(":id/employees/:userId")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Add an employee to a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiParam({ name: "userId", description: "User ID to add as employee" })
  addEmployee(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() addEmployeeDto?: AddEmployeeDto,
  ): Promise<Company> {
    return this.companyService.addEmployee(id, +userId, addEmployeeDto);
  }

  @Post(":id/employees-email/:userId")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Add an employee to a company by email" })
  @ApiParam({ name: "email", description: "Company Email" })
  @ApiParam({ name: "userId", description: "User ID to add as employee" })
  addEmployeeEmail(
    @Param("email") email: string,
    @Param("userId") userId: string,
    @Body() addEmployeeDto?: AddEmployeeDto,
  ): Promise<Company> {
    return this.companyService.addEmployeeEmail(email, +userId, addEmployeeDto);
  }

  @Delete(":id/employees/:userId")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Remove an employee from a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiParam({ name: "userId", description: "User ID to remove as employee" })
  removeEmployee(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() removeEmployeeDto?: RemoveEmployeeDto,
  ): Promise<Company> {
    return this.companyService.removeEmployee(id, +userId, removeEmployeeDto);
  }

  @Get(":id/location")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard, LocationGuard)
  @ApiOperation({ summary: "Get company location" })
  @ApiResponse({ status: 200, description: "Returns the company location" })
  getLocation(@Param("id") id: string) {
    return this.companyService.getLocation(id);
  }

  @Patch(":id/location")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard, LocationGuard)
  @ApiOperation({ summary: "Update company location" })
  @ApiResponse({
    status: 200,
    description: "Company location updated successfully",
  })
  updateLocation(
    @Param("id") id: string,
    @Body() updateLocationDto: UpdateCompanyLocationDto,
  ) {
    return this.companyService.updateLocation(id, updateLocationDto);
  }

  @UseGuards(AuthGuard)
  @Get("me/checkin-time")
  async getCompanyCheckInTime(@Request() req) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error("Usuario no tiene empresa asociada");
    }
    return {
      checkInTime: company.checkInTime || "07:00",
      companyName: company.name,
      companyId: company.id,
    };
  }

  @UseGuards(AuthGuard)
  @Patch("me/checkin-time")
  async updateCompanyCheckInTime(
    @Request() req,
    @Body() updateCheckInTimeDto: UpdateCheckInTimeDto,
  ) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error("Usuario no tiene empresa asociada");
    }

    return this.companyService.updateCheckInTime(
      company.id,
      updateCheckInTimeDto.checkInTime,
    );
  }

  @UseGuards(AuthGuard)
  @Get("me/attendance-stats")
  async getCompanyAttendanceStats(
    @Request() req,
    @Query() query: AttendanceStatsQueryDto,
  ) {
    const user = req.user;
    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new Error("Usuario no tiene empresa asociada");
    }

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    return this.companyService.getCompanyAttendanceStats(
      company.id,
      startDate,
      endDate,
    );
  }
}
