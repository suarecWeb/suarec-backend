import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import {
  Contract,
  ContractBid,
  ContractStatus,
} from "./entities/contract.entity";
import {
  CreateContractDto,
  CreateBidDto,
  AcceptBidDto,
} from "./dto/create-contract.dto";
import { Publication } from "../publication/entities/publication.entity";
import { User } from "../user/entities/user.entity";
import { EmailService } from "../email/email.service";

@Injectable()
export class ContractService {
  private readonly SUAREC_COMMISSION_RATE = 0.08; // 8%
  private readonly TAX_RATE = 0.19; // 19% IVA

  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>, // eslint-disable-line no-unused-vars
    @InjectRepository(ContractBid)
    private bidRepository: Repository<ContractBid>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    private emailService: EmailService, // eslint-disable-line no-unused-vars
  ) {}

  /**
   * Calcula las comisiones de SUAREC basadas en el precio actual
   */
  private calculateCommissions(currentPrice: number) {
    const suarecCommission = currentPrice * this.SUAREC_COMMISSION_RATE;
    const priceWithoutCommission = currentPrice - suarecCommission;
    const totalCommissionWithTax =
      suarecCommission + currentPrice * this.TAX_RATE;

    return {
      suarecCommission: Number(suarecCommission.toFixed(2)),
      priceWithoutCommission: Number(priceWithoutCommission.toFixed(2)),
      totalCommissionWithTax: Number(totalCommissionWithTax.toFixed(2)),
    };
  }

  async createContract(
    createContractDto: CreateContractDto,
  ): Promise<Contract> {
    try {
      console.log("🔍 Debug - Creando contrato con datos:", createContractDto);
      
      const {
        publicationId,
        clientId,
        initialPrice,
        totalPrice,
        priceUnit,
        clientMessage,
        requestedDate,
        requestedTime,
        paymentMethod,
        originalPaymentMethod,
        serviceAddress,
        propertyType,
        neighborhood,
        locationDescription,
      } = createContractDto;

      console.log("🔍 Debug - Datos extraídos:", {
        publicationId,
        clientId,
        initialPrice,
        totalPrice,
        priceUnit
      });

      // Verificar que la publicación existe
      const publication = await this.publicationRepository.findOne({
        where: { id: publicationId, deleted_at: null }, // Solo publicaciones activas
        relations: ["user"],
      });

      console.log("🔍 Debug - Publicación encontrada:", publication ? publication.id : "NO ENCONTRADA");

      if (!publication) {
        throw new NotFoundException("Publicación no encontrada");
      }

      // Obtener el providerId de la publicación automáticamente
      const providerId = publication.user?.id;
      if (!providerId) {
        throw new BadRequestException("La publicación no tiene un proveedor válido");
      }

      console.log("🔍 Debug - ProviderId obtenido de la publicación:", providerId);

      // Verificar que el cliente y proveedor existen
      const [client, provider] = await Promise.all([
        this.userRepository.findOne({ where: { id: clientId } }),
        this.userRepository.findOne({ where: { id: providerId } }),
      ]);

      console.log("🔍 Debug - Usuarios encontrados:", {
        client: client ? client.id : "NO ENCONTRADO",
        provider: provider ? provider.id : "NO ENCONTRADO"
      });

      if (!client || !provider) {
        throw new NotFoundException("Usuario no encontrado");
      }

      // Verificar que el cliente no está contratando su propio servicio
      if (clientId === providerId) {
        throw new BadRequestException("No puedes contratar tu propio servicio");
      }

      // Calcular precio con IVA (19%)
      const priceWithTax = Math.round(initialPrice + initialPrice * 0.19);
      const currentPriceWithTax = Math.round(initialPrice + initialPrice * 0.19);

      console.log("🔍 Debug - Precios calculados:", {
        initialPrice,
        priceWithTax,
        currentPriceWithTax
      });

      // Crear la contratación
      const contract = this.contractRepository.create({
        publication,
        client,
        provider,
        initialPrice,
        totalPrice: priceWithTax, // Usar precio con IVA
        currentPrice: currentPriceWithTax, // Usar precio con IVA
        priceUnit,
        clientMessage,
        requestedDate,
        requestedTime,
        paymentMethod,
        originalPaymentMethod,
        serviceAddress,
        propertyType,
        neighborhood,
        locationDescription,
        status: ContractStatus.PENDING, // Estado inicial: PENDING para que el proveedor lo revise
      });

      const savedContract = await this.contractRepository.save(contract);

      // Enviar notificación por email al proveedor
      await this.emailService.sendContractNotification(
        provider.email,
        "Nueva solicitud de contratación pendiente",
        `Has recibido una nueva solicitud de contratación para tu servicio "${publication.title}". Por favor, revisa los detalles y responde aceptando, rechazando o proponiendo una contraoferta.`,
      );

      return savedContract;
    } catch (error) {
      console.error("Error al crear contrato:", error);
      throw error;
    }
  }

  async createBid(createBidDto: CreateBidDto): Promise<ContractBid> {
    const { contractId, bidderId, amount, message } = createBidDto;

    // Verificar que el contrato existe
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    // Verificar que el ofertante existe
    const bidder = await this.userRepository.findOne({
      where: { id: bidderId },
    });
    if (!bidder) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar que el contrato está en estado de negociación
    if (
      contract.status !== ContractStatus.NEGOTIATING &&
      contract.status !== ContractStatus.PENDING
    ) {
      throw new BadRequestException(
        "El contrato no está disponible para ofertas",
      );
    }

    // Crear la oferta
    const bid = this.bidRepository.create({
      contract,
      bidder,
      amount,
      message,
    });

    const savedBid = await this.bidRepository.save(bid);

    // Actualizar el precio actual del contrato
    contract.currentPrice = amount;
    contract.status = ContractStatus.NEGOTIATING;
    await this.contractRepository.save(contract);

    // Determinar a quién notificar (el otro participante)
    // const recipient =
    //   contract.client.id === bidderId ? contract.provider : contract.client;

    // await this.emailVerificationService.sendServiceContractNotificationEmail(
    //   recipient.email,
    //   recipient.name,
    //   "IN_PROGRESS",
    //   {
    //     contractId: contract.id,
    //     serviceTitle: contract.publication.title,
    //     clientName: contract.client.name,
    //     providerName: contract.provider.name,
    //     agreedPrice: savedBid.amount,
    //   },
    // );

    return savedBid;
  }

  async acceptBid(acceptBidDto: AcceptBidDto): Promise<Contract> {
    const { bidId, acceptorId } = acceptBidDto;

    // Verificar que la oferta existe
    const bid = await this.bidRepository.findOne({
      where: { id: bidId },
      relations: ["contract", "contract.client", "contract.provider", "bidder"],
    });

    if (!bid) {
      throw new NotFoundException("Oferta no encontrada");
    }

    // Verificar que el contrato no está eliminado
    if (bid.contract.deleted_at) {
      throw new NotFoundException("Contrato no encontrado");
    }

    // Verificar que el aceptador es parte del contrato
    if (
      bid.contract.client.id !== acceptorId &&
      bid.contract.provider.id !== acceptorId
    ) {
      throw new BadRequestException(
        "No tienes permisos para aceptar esta oferta",
      );
    }

    // Marcar la oferta como aceptada
    bid.isAccepted = true;
    await this.bidRepository.save(bid);

    // Calcular las comisiones basadas en el precio de la oferta aceptada
    const commissions = this.calculateCommissions(bid.amount);

    // Actualizar el estado del contrato con los nuevos campos calculados
    bid.contract.status = ContractStatus.ACCEPTED;
    bid.contract.currentPrice = Number(bid.amount);
    bid.contract.totalPrice = Number(bid.amount) + (Number(bid.amount) * this.TAX_RATE); // Asumimos que el totalPrice es igual al amount de la oferta aceptada
    bid.contract.suarecCommission = commissions.suarecCommission;
    bid.contract.priceWithoutCommission = commissions.priceWithoutCommission;
    bid.contract.totalCommissionWithTax = commissions.totalCommissionWithTax;
    const updatedContract = await this.contractRepository.save(bid.contract);

    // Enviar notificación por email al otro participante
    // const recipient =
    //   bid.contract.client.id === acceptorId
    //     ? bid.contract.provider
    //     : bid.contract.client;

    //  await this.emailVerificationService.sendServiceContractNotificationEmail(
    //   recipient.email,
    //   recipient.name,
    //   "ACCEPTED",
    //   {
    //     contractId: updatedContract.id,
    //     serviceTitle: updatedContract.publication.title,
    //     clientName: updatedContract.client.name,
    //     providerName: updatedContract.provider.name,
    //     agreedPrice: updatedContract.currentPrice,
    //   },
    // );

    return updatedContract;
  }

  async getContractsByUser(
    userId: number,
  ): Promise<{ asClient: Contract[]; asProvider: Contract[] }> {
    const [asClient, asProvider] = await Promise.all([
      this.contractRepository.find({
        where: { client: { id: userId }, deleted_at: null }, // Solo contratos activos
        relations: ["publication", "client", "provider", "bids", "bids.bidder"],
      }),
      this.contractRepository.find({
        where: { provider: { id: userId }, deleted_at: null }, // Solo contratos activos
        relations: ["publication", "client", "provider", "bids", "bids.bidder"],
      }),
    ]);

    return { asClient, asProvider };
  }

  async getContractById(contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["publication", "client", "provider", "bids", "bids.bidder"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    return contract;
  }

  async cancelContract(contractId: string, userId: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.client.id !== userId && contract.provider.id !== userId) {
      throw new BadRequestException(
        "No tienes permisos para cancelar este contrato",
      );
    }

    contract.status = ContractStatus.CANCELLED;
    return await this.contractRepository.save(contract);
  }

  // Soft delete para contratos
  async softDeleteContract(contractId: string, userId: number): Promise<void> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    // Verificar permisos: solo el cliente, proveedor o admin puede eliminar
    if (contract.client.id !== userId && contract.provider.id !== userId) {
      throw new BadRequestException(
        "No tienes permisos para eliminar este contrato",
      );
    }

    // Soft delete: marcar como eliminado en lugar de remover físicamente
    await this.contractRepository.update(contractId, {
      deleted_at: new Date(),
    });
  }

  // Restaurar contrato eliminado (solo para admins)
  async restoreContract(contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: Not(IsNull()) }, // Solo contratos eliminados
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato eliminado no encontrado");
    }

    // Restaurar el contrato
    await this.contractRepository.update(contractId, {
      deleted_at: null,
    });

    return await this.getContractById(contractId);
  }

  async getPublicationBids(
    publicationId: string,
  ): Promise<{ contracts: Contract[]; totalBids: number }> {
    const contracts = await this.contractRepository.find({
      where: { publication: { id: publicationId }, deleted_at: null }, // Solo contratos activos
      relations: ["publication", "client", "provider", "bids", "bids.bidder"],
      order: { createdAt: "DESC" },
    });

    const totalBids = contracts.reduce(
      (total, contract) => total + contract.bids.length,
      0,
    );

    return { contracts, totalBids };
  }

  async providerResponse(
    contractId: string,
    providerId: number,
    action:
      | ContractStatus.ACCEPTED
      | ContractStatus.REJECTED
      | ContractStatus.NEGOTIATING,
    data: any,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.provider.id !== providerId) {
      throw new BadRequestException(
        "No tienes permisos para responder a este contrato",
      );
    }

    if (
      contract.status !== ContractStatus.PENDING &&
      contract.status !== ContractStatus.NEGOTIATING
    ) {
      throw new BadRequestException(
        "El contrato no está disponible para respuesta",
      );
    }

    switch (action) {
      case ContractStatus.ACCEPTED: {
        contract.status = ContractStatus.ACCEPTED;
        contract.providerMessage = data.providerMessage;
        contract.agreedDate = data.proposedDate || contract.requestedDate;
        contract.agreedTime = data.proposedTime || contract.requestedTime;

        // Calcular las comisiones basadas en el precio actual
        const acceptCommissions = this.calculateCommissions(
          contract.currentPrice,
        );
        contract.suarecCommission = acceptCommissions.suarecCommission;
        contract.priceWithoutCommission =
          acceptCommissions.priceWithoutCommission;
        contract.totalCommissionWithTax =
          acceptCommissions.totalCommissionWithTax;

        // Enviar notificación al cliente
        await this.emailService.sendContractNotification(
          contract.client.email,
          "Tu solicitud de contratación fue aceptada",
          `Tu solicitud para "${contract.publication.title}" ha sido aceptada por el proveedor.`,
        );
        break;
      }

      case ContractStatus.REJECTED:
        contract.status = ContractStatus.REJECTED;
        contract.providerMessage = data.providerMessage;

        // Enviar notificación al cliente
        await this.emailService.sendContractNotification(
          contract.client.email,
          "Tu solicitud de contratación fue rechazada",
          `Tu solicitud para "${contract.publication.title}" ha sido rechazada por el proveedor.`,
        );
        break;

      case ContractStatus.NEGOTIATING: {
        contract.status = ContractStatus.NEGOTIATING;
        contract.providerMessage = data.providerMessage;
        contract.currentPrice = data.counterOffer || contract.initialPrice;

        // Crear una oferta automática del proveedor
        const providerBid = this.bidRepository.create({
          contract,
          bidder: contract.provider,
          amount: data.counterOffer || contract.initialPrice,
          message: data.providerMessage,
        });
        await this.bidRepository.save(providerBid);

        // Enviar notificación al cliente
        await this.emailService.sendContractNotification(
          contract.client.email,
          "Nueva propuesta en tu contratación",
          `El proveedor ha enviado una nueva propuesta para "${contract.publication.title}".`,
        );
        break;
      }
    }

    return await this.contractRepository.save(contract);
  }
}
