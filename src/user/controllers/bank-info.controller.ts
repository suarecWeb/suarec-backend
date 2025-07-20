import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { BankInfoService } from "../services/bank-info.service";
import { CreateBankInfoDto, UpdateBankInfoDto, BankInfoResponseDto } from "../dto/bank-info.dto";

@ApiTags("bank-info")
@Controller("users/:userId/bank-info")
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class BankInfoController {
  constructor(private readonly bankInfoService: BankInfoService) {}

  @Post()
  @ApiOperation({ summary: "Crear información bancaria del usuario" })
  @ApiResponse({
    status: 201,
    description: "Información bancaria creada exitosamente",
    type: BankInfoResponseDto,
  })
  @ApiResponse({ status: 403, description: "Sin permisos para realizar esta acción" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async create(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() createBankInfoDto: CreateBankInfoDto,
    @Req() req: any,
  ): Promise<BankInfoResponseDto> {
    // Solo el dueño de la cuenta puede crear su información bancaria
    if (userId !== req.user.id) {
      throw new Error("Solo puedes crear tu propia información bancaria");
    }

    return this.bankInfoService.create(userId, createBankInfoDto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener información bancaria del usuario" })
  @ApiResponse({
    status: 200,
    description: "Información bancaria obtenida exitosamente",
    type: BankInfoResponseDto,
  })
  @ApiResponse({ status: 403, description: "Sin permisos para acceder a esta información" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async findOne(
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: any,
  ): Promise<BankInfoResponseDto | null> {
    const isAdmin = req.user.roles?.includes("ADMIN") || false;
    return this.bankInfoService.findByUserId(userId, req.user.id, isAdmin);
  }

  @Put()
  @ApiOperation({ summary: "Actualizar información bancaria del usuario" })
  @ApiResponse({
    status: 200,
    description: "Información bancaria actualizada exitosamente",
    type: BankInfoResponseDto,
  })
  @ApiResponse({ status: 403, description: "Sin permisos para realizar esta acción" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async update(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() updateBankInfoDto: UpdateBankInfoDto,
    @Req() req: any,
  ): Promise<BankInfoResponseDto> {
    // Solo el dueño de la cuenta puede actualizar su información bancaria
    if (userId !== req.user.id) {
      throw new Error("Solo puedes actualizar tu propia información bancaria");
    }

    return this.bankInfoService.update(userId, updateBankInfoDto);
  }

  @Delete()
  @ApiOperation({ summary: "Eliminar información bancaria del usuario" })
  @ApiResponse({ status: 200, description: "Información bancaria eliminada exitosamente" })
  @ApiResponse({ status: 403, description: "Sin permisos para realizar esta acción" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async remove(
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Solo el dueño de la cuenta puede eliminar su información bancaria
    if (userId !== req.user.id) {
      throw new Error("Solo puedes eliminar tu propia información bancaria");
    }

    await this.bankInfoService.delete(userId);
    return { message: "Información bancaria eliminada exitosamente" };
  }

  // Endpoint especial para admins para ver información bancaria de cualquier usuario
  @Get("admin")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Obtener información bancaria (solo admins)" })
  @ApiResponse({
    status: 200,
    description: "Información bancaria obtenida exitosamente",
    type: BankInfoResponseDto,
  })
  async findOneAsAdmin(
    @Param("userId", ParseIntPipe) userId: number,
  ): Promise<BankInfoResponseDto | null> {
    return this.bankInfoService.findByUserId(userId, userId, true);
  }
}
