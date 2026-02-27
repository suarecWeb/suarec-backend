import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/guard/auth.guard";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { PushService } from "./push.service";

@ApiTags("Push Tokens")
@Controller("push-tokens")
@UseGuards(AuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {} // eslint-disable-line no-unused-vars

  @Post()
  @ApiOperation({ summary: "Registrar o actualizar un push token" })
  @ApiResponse({ status: 201, description: "Token registrado correctamente" })
  async registerToken(
    @Body() dto: RegisterPushTokenDto,
    @Request() req: any,
  ) {
    const requester = req.user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.includes("ADMIN");
    if (dto.userId !== requester.id && !isAdmin) {
      throw new ForbiddenException("No puedes registrar tokens para otro usuario");
    }

    return this.pushService.registerToken(dto.userId, dto);
  }

  @Delete(":token")
  @ApiOperation({ summary: "Invalidar un push token" })
  @ApiResponse({ status: 200, description: "Token invalidado correctamente" })
  async invalidateToken(@Param("token") token: string, @Request() req: any) {
    return this.pushService.invalidateToken(token, req.user);
  }

  @Get()
  @ApiOperation({ summary: "Listar push tokens por usuario" })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "ID del usuario (opcional). Si no se envía, usa el usuario autenticado",
  })
  async getTokens(@Query("userId") userId: string | undefined, @Request() req: any) {
    const requester = req.user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.includes("ADMIN");
    const targetUserId = userId ? Number(userId) : requester.id;

    if (Number.isNaN(targetUserId)) {
      throw new BadRequestException("userId inválido");
    }

    if (targetUserId !== requester.id && !isAdmin) {
      throw new ForbiddenException("No tienes permisos para ver tokens de otro usuario");
    }

    return this.pushService.getTokensByUser(targetUserId);
  }
}
