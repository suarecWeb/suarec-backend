import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { WompiBanksService, WompiBankResponse } from "../services/wompi-banks.service";

@ApiTags("banks")
@Controller("banks")
export class BanksController {
  constructor(private readonly wompiBanksService: WompiBanksService) {}

  @Get()
  @ApiOperation({ summary: "Obtener lista de bancos disponibles desde Wompi" })
  @ApiResponse({
    status: 200,
    description: "Lista de bancos obtenida exitosamente",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", example: "001" },
          name: { type: "string", example: "Bancolombia" },
          code: { type: "string", example: "1007" },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: "Error interno del servidor" })
  async getBanks(): Promise<WompiBankResponse[]> {
    return this.wompiBanksService.getBanks();
  }
}
