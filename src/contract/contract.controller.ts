import { Controller, Post, Get, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto, CreateBidDto, AcceptBidDto, ProviderResponseDto } from './dto/create-contract.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';

@Controller('contracts')
@UseGuards(AuthGuard, RolesGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async createContract(@Body() createContractDto: CreateContractDto, @Request() req) {
    // El cliente será el usuario autenticado
    createContractDto.clientId = req.user.id;
    return await this.contractService.createContract(createContractDto);
  }

  @Post('provider-response')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async providerResponse(@Body() providerResponseDto: ProviderResponseDto, @Request() req) {
    // El proveedor será el usuario autenticado
    return await this.contractService.providerResponse(
      providerResponseDto.contractId,
      req.user.id,
      providerResponseDto.action,
      {
        providerMessage: providerResponseDto.providerMessage,
        counterOffer: providerResponseDto.counterOffer,
        proposedDate: providerResponseDto.proposedDate,
        proposedTime: providerResponseDto.proposedTime
      }
    );
  }

  @Post('bid')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async createBid(@Body() createBidDto: CreateBidDto, @Request() req) {
    // El ofertante será el usuario autenticado
    createBidDto.bidderId = req.user.id;
    return await this.contractService.createBid(createBidDto);
  }

  @Post('accept-bid')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async acceptBid(@Body() acceptBidDto: AcceptBidDto, @Request() req) {
    // El aceptador será el usuario autenticado
    acceptBidDto.acceptorId = req.user.id;
    return await this.contractService.acceptBid(acceptBidDto);
  }

  @Get('my-contracts')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async getMyContracts(@Request() req) {
    return await this.contractService.getContractsByUser(req.user.id);
  }

  @Get('publication/:publicationId/bids')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async getPublicationBids(@Param('publicationId') publicationId: string) {
    return await this.contractService.getPublicationBids(publicationId);
  }

  @Get(':id')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async getContractById(@Param('id') id: string) {
    return await this.contractService.getContractById(id);
  }

  @Delete(':id/cancel')
  @Roles('ADMIN', 'BUSINESS', 'PERSON')
  async cancelContract(@Param('id') id: string, @Request() req) {
    return await this.contractService.cancelContract(id, req.user.id);
  }
} 