import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
  BadRequestException,
  Patch,
} from "@nestjs/common";
import { ContractService } from "./contract.service";
import { CreateContractDto, CreateBidDto, AcceptBidDto, ProviderResponseDto, VerifyOTPDto, ResendOTPDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { AuthGuard } from "../auth/guard/auth.guard";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";

@Controller("contracts")
@UseGuards(AuthGuard, RolesGuard)
export class ContractController {
  @Patch(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async updateContract(
    @Param("id") id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Request() req,
  ) {
    // Only provider or client can update contract (add more checks if needed)
    return await this.contractService.updateContract(id, req.user.id, updateContractDto);
  }
  constructor(private readonly contractService: ContractService) {} // eslint-disable-line no-unused-vars

  @Post()
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async createContract(
    @Body() createContractDto: CreateContractDto,
    @Request() req,
  ) {
    console.log("🔍 Debug - Controlador createContract recibió:", {
      createContractDto,
      userId: req.user?.id
    });
    
    // Si no se especifica clientId, el cliente será el usuario autenticado (flujo normal)
    // Si se especifica clientId, respetarlo (flujo de SERVICE_REQUEST)
    if (!createContractDto.clientId) {
      createContractDto.clientId = req.user.id;
    }
    
    console.log("🔍 Debug - DTO actualizado:", createContractDto);
    
    return await this.contractService.createContract(createContractDto);
  }

  @Post("provider-response")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async providerResponse(
    @Body() providerResponseDto: ProviderResponseDto,
    @Request() req,
  ) {
    // El proveedor será el usuario autenticado
    return await this.contractService.providerResponse(
      providerResponseDto.contractId,
      req.user.id,
      providerResponseDto.action,
      {
        providerMessage: providerResponseDto.providerMessage,
        counterOffer: providerResponseDto.counterOffer,
        proposedDate: providerResponseDto.proposedDate,
        proposedTime: providerResponseDto.proposedTime,
      },
    );
  }

  @Post("bid")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async createBid(@Body() createBidDto: CreateBidDto, @Request() req) {
    // El ofertante será el usuario autenticado
    createBidDto.bidderId = req.user.id;
    return await this.contractService.createBid(createBidDto);
  }

  @Post("accept-bid")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async acceptBid(@Body() acceptBidDto: AcceptBidDto, @Request() req) {
    // El aceptador será el usuario autenticado
    acceptBidDto.acceptorId = req.user.id;
    return await this.contractService.acceptBid(acceptBidDto);
  }

  @Get("my-contracts")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async getMyContracts(@Request() req) {
    return await this.contractService.getContractsByUser(req.user.id);
  }

  @Get("publication/:publicationId/bids")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async getPublicationBids(@Param("publicationId") publicationId: string) {
    return await this.contractService.getPublicationBids(publicationId);
  }

  @Get(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async getContractById(@Param("id") id: string) {
    return await this.contractService.getContractById(id);
  }

  @Get(":id/check-penalty")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async checkPenaltyRequired(@Param("id") id: string, @Request() req) {
    return await this.contractService.checkPenaltyRequired(id, req.user.id);
  }

  @Post(":id/cancellation-penalty")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async createCancellationPenaltyPayment(@Param("id") id: string, @Request() req) {
    return await this.contractService.createCancellationPenaltyPayment(id, req.user.id);
  }

  @Delete(":id/cancel")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async cancelContract(@Param("id") id: string, @Request() req) {
    return await this.contractService.cancelContract(id, req.user.id);
  }

  @Delete(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async softDeleteContract(@Param("id") id: string, @Request() req) {
    return await this.contractService.softDeleteContract(id, req.user.id);
  }

  @Post(":id/restore")
  @Roles("ADMIN")
  async restoreContract(@Param("id") id: string) {
    return await this.contractService.restoreContract(id);
  }

  @Post(":id/complete")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async completeContract(@Param("id") id: string, @Request() req) {
    return await this.contractService.completeContract(id, req.user.id);
  }

  @Post(":id/generate-otp")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async generateOTP(@Param("id") id: string, @Request() req) {
    return await this.contractService.generateContractOTP(id, req.user.id);
  }

  @Post(":id/verify-otp")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async verifyOTP(@Param("id") id: string, @Body() verifyOTPDto: VerifyOTPDto, @Request() req) {
    return await this.contractService.verifyContractOTP(id, verifyOTPDto.otpCode, req.user.id);
  }

  @Post(":id/resend-otp")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  async resendOTP(@Param("id") id: string, @Request() req) {
    return await this.contractService.resendContractOTP(id, req.user.id);
  }
}
