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
import { PermissionService } from "./permission.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { Roles } from "../auth/decorators/role.decorator";
import { RolesGuard } from "../auth/guard/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { Permission } from "./entities/permission.entity";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

@ApiTags("Permissions")
@Controller("permissions")
@UseGuards(RolesGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create a new permission" })
  @ApiResponse({ status: 201, description: "Permission created successfully" })
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto);
  }

  @Get()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all permissions with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Permission>> {
    return this.permissionService.findAll(paginationDto);
  }

  @Get(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get a permission by id" })
  findOne(@Param("id") id: string) {
    return this.permissionService.findOne(+id);
  }

  @Put(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update a permission" })
  update(
    @Param("id") id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(+id, updatePermissionDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete a permission" })
  remove(@Param("id") id: string) {
    return this.permissionService.remove(+id);
  }
}
