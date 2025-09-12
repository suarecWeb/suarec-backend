import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { BalanceService } from "../services/balance.service";

@ApiTags("balance")
@Controller("balance")
@UseGuards(AuthGuard, RolesGuard)
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get("current")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @ApiOperation({ summary: "Obtener balance actual del usuario" })
  @ApiResponse({ status: 200, description: "Balance obtenido exitosamente" })
  async getCurrentBalance(@Request() req) {
    const user = await this.balanceService.getUserWithBalances(req.user.id);
    const canRequestNewService = await this.balanceService.canRequestNewService(req.user.id);
    
    const response = {
      debitBalance: user.debit_balance,
      creditBalance: user.credit_balance,
      canRequestNewService,
    };
    
    console.log('🔍 BalanceController Response:', response);
    return response;
  }

  @Get("history")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @ApiOperation({ summary: "Obtener historial de transacciones de balance" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Número de página" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Elementos por página" })
  @ApiResponse({ status: 200, description: "Historial obtenido exitosamente" })
  async getBalanceHistory(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.balanceService.getBalanceHistory(req.user.id, page, limit);
  }

  @Get("stats")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @ApiOperation({ summary: "Obtener estadísticas de balance del usuario" })
  @ApiResponse({ status: 200, description: "Estadísticas obtenidas exitosamente" })
  async getBalanceStats(@Request() req) {
    return await this.balanceService.getBalanceStats(req.user.id);
  }

  @Get("can-request-service")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @ApiOperation({ summary: "Verificar si el usuario puede solicitar nuevos servicios" })
  @ApiResponse({ status: 200, description: "Verificación completada" })
  async canRequestNewService(@Request() req) {
    const canRequest = await this.balanceService.canRequestNewService(req.user.id);
    return {
      canRequestNewService: canRequest,
    };
  }
}
