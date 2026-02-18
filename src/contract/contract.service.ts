import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import {
  Contract,
  ContractBid,
  ContractOTP,
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
import { PaymentService } from "../payment/services/payment.service";
import { PaymentMethod, PaymentStatus } from "../enums/paymentMethod.enum";
import { BalanceService } from "../user/services/balance.service";
import { PushService } from "../push/push.service";
import { PaymentTransaction } from "../payment/entities/payment-transaction.entity";
import { createHash, timingSafeEqual } from "crypto";

@Injectable()
export class ContractService {
  async updateContract(contractId: string, userId: number, updateContractDto: any): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id: contractId }, relations: ["provider", "client", "publication"] });
    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }
    // Only provider or client can update
    if (contract.provider.id !== userId && contract.client.id !== userId) {
      throw new BadRequestException("No tienes permisos para editar este contrato");
    }
    const frozenStatuses = [
      ContractStatus.ACCEPTED,
      ContractStatus.COMPLETED,
      ContractStatus.CANCELLED,
    ];
    const frozenFields = [
      "initialPrice",
      "totalPrice",
      "currentPrice",
      "priceUnit",
      "serviceAddress",
      "propertyType",
      "neighborhood",
      "locationDescription",
      "latitude",
      "longitude",
    ];
    if (frozenStatuses.includes(contract.status)) {
      const attemptedFrozenUpdate = frozenFields.filter(
        (field) => typeof updateContractDto?.[field] !== "undefined",
      );
      if (attemptedFrozenUpdate.length > 0) {
        throw new BadRequestException(
          "No puedes modificar precio, tarifa o ubicacion cuando el contrato esta aceptado.",
        );
      }
    }
    const priceFields = ["initialPrice", "totalPrice", "currentPrice"];
    for (const field of priceFields) {
      if (
        typeof updateContractDto?.[field] === "number" &&
        updateContractDto[field] < this.MIN_SERVICE_PRICE
      ) {
        throw new BadRequestException(
          `El precio minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
        );
      }
    }
    const previousStatus = contract.status;
    Object.assign(contract, updateContractDto);
    const updatedContract = await this.contractRepository.save(contract);
    if (updatedContract.status === ContractStatus.ACCEPTED) {
      try {
        await this.paymentService.ensureWompiPaymentForContract(updatedContract.id);
      } catch (error) {
        console.error("Error creating payment link:", error);
      }
    }

    if (updateContractDto.status && updateContractDto.status !== previousStatus) {
      const recipientId =
        updatedContract.client?.id === userId
          ? updatedContract.provider?.id
          : updatedContract.client?.id;
      if (recipientId) {
        await this.sendContractPush(
          updatedContract,
          recipientId,
          "Estado de contrato actualizado",
          `El estado del contrato cambió a ${updatedContract.status}.`,
        );
      }
    }

    return updatedContract;
  }
  async updateProviderMessage(contractId: string, providerId: number, providerMessage: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id: contractId }, relations: ["provider"] });
    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }
    if (contract.provider.id !== providerId) {
      throw new BadRequestException("No tienes permisos para editar este mensaje");
    }
    contract.providerMessage = providerMessage;
    return await this.contractRepository.save(contract);
  }
  private readonly SUAREC_COMMISSION_RATE = 0.08; // 8%
  private readonly MIN_SUAREC_COMMISSION = 7000;
  private readonly MIN_SERVICE_PRICE = 20000;
  private readonly TAX_RATE = 0.19; // 19% IVA
  private readonly DEFAULT_OTP_LENGTH = 4;
  private readonly OTP_EXPIRES_HOURS = 24;
  private readonly OTP_MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>, // eslint-disable-line no-unused-vars
    @InjectRepository(ContractBid)
    private bidRepository: Repository<ContractBid>, // eslint-disable-line no-unused-vars
    @InjectRepository(ContractOTP)
    private otpRepository: Repository<ContractOTP>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    private emailService: EmailService, // eslint-disable-line no-unused-vars
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService, // eslint-disable-line no-unused-vars
    @Inject(forwardRef(() => BalanceService))
    private balanceService: BalanceService, // eslint-disable-line no-unused-vars
    private pushService: PushService, // eslint-disable-line no-unused-vars
  ) {}

  /**
   * Calcula las comisiones de SUAREC basadas en el precio actual
   * Solo aplica IVA si el proveedor es una empresa (persona jurídica)
   */
  private calculateCommissions(currentPrice: number, isProviderCompany: boolean = false) {
    const rawCommission = currentPrice * this.SUAREC_COMMISSION_RATE;
    const suarecCommission = Math.max(rawCommission, this.MIN_SUAREC_COMMISSION);
    const priceWithoutCommission = currentPrice - suarecCommission;
    
    // Solo aplicar IVA si el proveedor es una empresa
    const taxAmount = isProviderCompany ? currentPrice * this.TAX_RATE : 0;
    const totalCommissionWithTax = suarecCommission + taxAmount;

    return {
      suarecCommission: Number(suarecCommission.toFixed(2)),
      priceWithoutCommission: Number(priceWithoutCommission.toFixed(2)),
      totalCommissionWithTax: Number(totalCommissionWithTax.toFixed(2)),
    };
  }

  /**
   * Verifica si se requiere penalización por cancelación basado en el tiempo
   * @param contract - Contrato a verificar
   * @returns true si se requiere penalización, false si se puede cancelar sin penalización
   */
  public isPenaltyRequired(contract: Contract): boolean {
    // Si no hay fecha acordada, usar la fecha solicitada
    const serviceDate = contract.agreedDate || contract.requestedDate;
    const serviceTime = contract.agreedTime || contract.requestedTime;

    if (!serviceDate || !serviceTime) {
      // Si no hay fecha/hora definida, siempre se requiere penalización
      return true;
    }

    // Convertir serviceDate a Date si es necesario
    const dateObj = serviceDate instanceof Date ? serviceDate : new Date(serviceDate);
    
    // Extraer horas y minutos del serviceTime
    const [hours, minutes] = serviceTime.split(':').map(Number);
    
    // Crear la fecha y hora del servicio
    const serviceDateTime = new Date(dateObj);
    serviceDateTime.setHours(hours, minutes, 0, 0);

    // Calcular 1 hora antes del servicio
    const penaltyDeadline = new Date(serviceDateTime.getTime() - (60 * 60 * 1000));

    // Si la hora actual es antes del deadline, no se requiere penalización
    const now = new Date();
    return now >= penaltyDeadline;
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
        quantity,
      clientMessage,
        requestedDate,
        requestedTime,
        paymentMethod,
        originalPaymentMethod,
        serviceAddress,
        propertyType,
        neighborhood,
        locationDescription,
        latitude,
        longitude,
      } = createContractDto;

      if (
        initialPrice < this.MIN_SERVICE_PRICE ||
        totalPrice < this.MIN_SERVICE_PRICE
      ) {
        throw new BadRequestException(
          `El precio minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
        );
      }

      if (!serviceAddress) {
        throw new BadRequestException(
          "Se requiere direccion para crear la orden.",
        );
      }

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

      if (!publication) {
        throw new NotFoundException("Publicación no encontrada");
      }

      // Usar el providerId del DTO si se especifica, sino obtenerlo de la publicación
      const providerId = createContractDto.providerId || publication.user?.id;
      if (!providerId) {
        throw new BadRequestException("La publicación no tiene un proveedor válido");
      }

      console.log("🔍 Debug - ProviderId final:", providerId, "del DTO:", createContractDto.providerId, "de publicación:", publication.user?.id);


      // Verificar que el cliente y proveedor existen
      const [client, provider] = await Promise.all([
        this.userRepository.findOne({ 
          where: { id: clientId },
          relations: ["roles", "company"]
        }),
        this.userRepository.findOne({ 
          where: { id: providerId },
          relations: ["roles", "company"]
        }),
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

    await this.paymentService.ensureProviderCanOffer(provider.id);

    // Verificar que el cliente no tiene saldo negativo (puede solicitar nuevos servicios)
    const canRequestNewService = await this.balanceService.canRequestNewService(clientId);
    if (!canRequestNewService) {
      throw new BadRequestException("No puedes solicitar nuevos servicios. Tienes un saldo negativo pendiente de pago. Debes pagar tu saldo pendiente antes de solicitar nuevos servicios.");
    }

      // Crear la contratación usando los valores del frontend
      const contract = this.contractRepository.create({
        publication,
        client,
        provider,
        initialPrice,
        totalPrice, // Usar el totalPrice que viene del frontend (ya incluye IVA)
        currentPrice: totalPrice, // Usar el mismo totalPrice como precio actual
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
        latitude,
        longitude,
        status: createContractDto.clientMessage?.includes('Contrato creado automáticamente desde aplicación aceptada') 
          ? ContractStatus.ACCEPTED // Si es desde aplicación aceptada, ya hay acuerdo
          : ContractStatus.PENDING, // Estado inicial: PENDING para que el proveedor lo revise
      });

      if (contract.status === ContractStatus.ACCEPTED) {
        const isProviderCompany =
          provider.roles?.some((role) => role.name === "BUSINESS") || false;
        const commissions = this.calculateCommissions(
          Number(
            contract.currentPrice ||
              contract.totalPrice ||
              contract.initialPrice,
          ),
          isProviderCompany,
        );
        contract.suarecCommission = commissions.suarecCommission;
        contract.priceWithoutCommission = commissions.priceWithoutCommission;
        contract.totalCommissionWithTax = commissions.totalCommissionWithTax;
      }

    const savedContract = await this.contractRepository.save(contract);

      // Enviar notificación por email al proveedor
      await this.emailService.sendContractNotification(
        provider.email,
        "Nueva solicitud de contratación pendiente",
        `Has recibido una nueva solicitud de contratación para tu servicio "${publication.title}". Por favor, revisa los detalles y responde aceptando, rechazando o proponiendo una contraoferta.`,
      );

      await this.sendContractPush(
        savedContract,
        provider.id,
        savedContract.status === ContractStatus.ACCEPTED
          ? "Nueva contratación aceptada"
          : "Nueva solicitud de contratación",
        `Tienes una nueva solicitud para "${publication.title}".`,
      );

    if (savedContract.status === ContractStatus.ACCEPTED) {
      try {
        await this.paymentService.ensureWompiPaymentForContract(savedContract.id);
      } catch (error) {
        console.error("Error creating payment link:", error);
      }
    }

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

    if (amount < this.MIN_SERVICE_PRICE) {
      throw new BadRequestException(
        `El monto minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
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
      relations: ["contract", "contract.client", "contract.provider", "contract.publication", "bidder"],
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

    if (bid.amount < this.MIN_SERVICE_PRICE) {
      throw new BadRequestException(
        `El monto minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
      );
    }

    await this.paymentService.ensureProviderCanOffer(bid.contract.provider.id);

    // Marcar la oferta como aceptada
    bid.isAccepted = true;
    await this.bidRepository.save(bid);

    // Verificar si el proveedor es una empresa para aplicar IVA
    const isProviderCompany = bid.contract.provider.roles?.some(role => role.name === 'BUSINESS') || false;
    
    // Calcular las comisiones basadas en el precio de la oferta aceptada
    const commissions = this.calculateCommissions(bid.amount, isProviderCompany);

    // Actualizar el estado del contrato con los nuevos campos calculados
    bid.contract.status = ContractStatus.ACCEPTED;
    bid.contract.currentPrice = Number(bid.amount);
    bid.contract.totalPrice = Number(bid.amount); // El monto de la oferta ya incluye IVA
    bid.contract.suarecCommission = commissions.suarecCommission;
    bid.contract.priceWithoutCommission = commissions.priceWithoutCommission;
    bid.contract.totalCommissionWithTax = commissions.totalCommissionWithTax;
    const updatedContract = await this.contractRepository.save(bid.contract);
    try {
      await this.paymentService.ensureWompiPaymentForContract(updatedContract.id);
    } catch (error) {
      console.error("Error creating payment link:", error);
    }

    const recipientId =
      bid.contract.client.id === acceptorId
        ? bid.contract.provider.id
        : bid.contract.client.id;
    await this.sendContractPush(
      updatedContract,
      recipientId,
      "Oferta aceptada",
      `La oferta para "${bid.contract.publication?.title || "tu contrato"}" fue aceptada.`,
    );

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
  ): Promise<{ asClient: any[]; asProvider: any[] }> {
    const [asClient, asProvider] = await Promise.all([
      this.contractRepository.find({
        where: { client: { id: userId }, deleted_at: null }, // Solo contratos activos
        relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
      }),
      this.contractRepository.find({
        where: { provider: { id: userId }, deleted_at: null }, // Solo contratos activos
        relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
      }),
    ]);

    const [asClientWithPaymentData, asProviderWithPaymentData] =
      await Promise.all([
        Promise.all(asClient.map((contract) => this.decorateContractReadModel(contract))),
        Promise.all(asProvider.map((contract) => this.decorateContractReadModel(contract))),
      ]);

    return {
      asClient: asClientWithPaymentData,
      asProvider: asProviderWithPaymentData,
    };
  }

  async getContractById(contractId: string): Promise<any> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    return this.decorateContractReadModel(contract);
  }

  async generatePaymentLinkForContract(
    contractId: string,
    userId: number,
    roles: string[],
  ) {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    const isAdmin = roles?.includes("ADMIN");
    const isClient = contract.client?.id === userId;
    const isProvider = contract.provider?.id === userId;

    if (!isAdmin && !isClient && !isProvider) {
      throw new BadRequestException(
        "No tienes permisos para generar el link de pago de este contrato",
      );
    }

    return this.paymentService.ensureWompiPaymentForContract(contract.id);
  }

  async checkPenaltyRequired(contractId: string, userId: number): Promise<{ requiresPenalty: boolean; message?: string }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.client.id !== userId && contract.provider.id !== userId) {
      throw new BadRequestException("No tienes permisos para verificar este contrato");
    }

    const requiresPenalty = this.isPenaltyRequired(contract);
    
    if (!requiresPenalty) {
      return {
        requiresPenalty: false,
        message: "No se requiere penalización. Puedes cancelar el contrato directamente hasta 1 hora antes del servicio."
      };
    }

    return {
      requiresPenalty: true,
      message: "Se requiere penalización por cancelación. El servicio está programado para menos de 1 hora."
    };
  }

  async cancelContract(contractId: string, userId: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.client.id !== userId && contract.provider.id !== userId) {
      throw new BadRequestException(
        "No tienes permisos para cancelar este contrato",
      );
    }

    // Verificar si se requiere penalización basado en el tiempo
    const penaltyRequired = this.isPenaltyRequired(contract);

    if (penaltyRequired) {
      // Si se requiere penalización, verificar que se haya pagado
      const penaltyPayments = await this.paymentService.findByContract(contractId);
      const hasPaidPenalty = penaltyPayments.some(payment => 
        payment.reference?.startsWith('PENALTY-') && 
        payment.status === 'COMPLETED' &&
        payment.payer.id === userId
      );

      if (!hasPaidPenalty) {
        throw new BadRequestException(
          "Debes pagar la penalización por cancelación antes de poder cancelar el contrato"
        );
      }
    }

    // Proceder con la cancelación del contrato (con o sin penalización)
    contract.status = ContractStatus.CANCELLED;
    if (!contract.cancelledAt) {
      contract.cancelledAt = new Date();
    }
    const cancelledContract = await this.contractRepository.save(contract);

    const recipientId =
      contract.client.id === userId ? contract.provider.id : contract.client.id;
    await this.sendContractPush(
      cancelledContract,
      recipientId,
      "Contrato cancelado",
      `El contrato "${contract.publication?.title || contract.id}" fue cancelado.`,
    );

    return cancelledContract;
  }

  async createCancellationPenaltyPayment(contractId: string, userId: number): Promise<any> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.client.id !== userId && contract.provider.id !== userId) {
      throw new BadRequestException(
        "No tienes permisos para cancelar este contrato",
      );
    }

    // Verificar si se requiere penalización basado en el tiempo
    if (!this.isPenaltyRequired(contract)) {
      throw new BadRequestException(
        "No se requiere penalización. Puedes cancelar el contrato directamente hasta 1 hora antes del servicio."
      );
    }

    // Determinar quién es el payee para la penalización
    // Si el cliente está cancelando, el payee es el proveedor
    // Si el proveedor está cancelando, el payee es el cliente
    let payeeId: number;
    if (contract.client.id === userId) {
      // El cliente está cancelando, el payee es el proveedor
      payeeId = contract.provider.id;
    } else {
      // El proveedor está cancelando, el payee es el cliente
      payeeId = contract.client.id;
    }

    // Crear el pago de penalización usando el PaymentService
    const createPaymentDto = {
      amount: 10000, // $10,000 pesos colombianos
      currency: "COP",
      payment_method: PaymentMethod.Wompi,
      contract_id: contractId,
      payee_id: payeeId, // El otro participante del contrato recibe la penalización
      description: `Penalización por cancelación de contrato: ${contract.publication?.title || 'Contrato'}`,
      reference: `PENALTY-${contractId.substring(0, 8)}`,
    };

    // Crear el pago real usando el PaymentService
    const paymentTransaction = await this.paymentService.createPayment(createPaymentDto, userId);

    // Retornar la información del pago incluyendo el enlace de Wompi
    return {
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      currency: paymentTransaction.currency,
      status: paymentTransaction.status,
      wompi_payment_link: paymentTransaction.wompi_payment_link,
      description: paymentTransaction.description,
      contract_id: contractId,
    };
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

  async completeContract(contractId: string, userId: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.provider.id !== userId) {
      throw new BadRequestException(
        "Solo el proveedor del servicio puede marcar el contrato como completado"
      );
    }

    if (contract.status === ContractStatus.CANCELLED) {
      throw new BadRequestException(
        "No se pueden marcar como completados los contratos que están en estado 'CANCELLED'"
      );
    }

    if (!contract.agreedDate || !contract.agreedTime) {
      throw new BadRequestException(
        "No se puede marcar como completado un contrato sin fecha y hora acordada"
      );
    }

    const agreedDate = contract.agreedDate instanceof Date ? contract.agreedDate : new Date(contract.agreedDate);
    const [hours, minutes] = contract.agreedTime.split(':').map(Number);
    
    const serviceDateTime = new Date(agreedDate);
    serviceDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    if (now < serviceDateTime) {
      throw new BadRequestException(
        "No se puede marcar como completado un contrato antes de la fecha y hora acordada del servicio"
      );
    }

    contract.status = ContractStatus.COMPLETED;
    if (!contract.completedAt) {
      contract.completedAt = new Date();
    }
    const updatedContract = await this.contractRepository.save(contract);

    // Enviar notificación por email al cliente sobre la completación
    try {
      await this.emailService.sendContractNotification(
        contract.client.email,
        "Servicio completado",
        `El servicio "${contract.publication.title}" ha sido marcado como completado por el proveedor. Para confirmar que el servicio se realizó satisfactoriamente y proceder con el pago, ve a la sección de contratos y haz clic en "Verificar Servicio (OTP)".`,
      );
    } catch (error) {
      // No lanzar error para no interrumpir la completación del contrato
    }

    await this.sendContractPush(
      updatedContract,
      contract.client.id,
      "Servicio completado",
      `El servicio "${contract.publication.title}" fue marcado como completado.`,
    );

    return updatedContract;
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

    if (action !== ContractStatus.REJECTED) {
      await this.paymentService.ensureProviderCanOffer(contract.provider.id);
    }

    switch (action) {
      case ContractStatus.ACCEPTED: {
        const acceptedPrice = Number(
          contract.currentPrice || contract.totalPrice || contract.initialPrice,
        );
        if (acceptedPrice < this.MIN_SERVICE_PRICE) {
          throw new BadRequestException(
            `El precio minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
          );
        }

        contract.status = ContractStatus.ACCEPTED;
        contract.providerMessage = data.providerMessage;
        contract.agreedDate = data.proposedDate || contract.requestedDate;
        contract.agreedTime = data.proposedTime || contract.requestedTime;

        // Verificar si el proveedor es una empresa para aplicar IVA
        const isProviderCompany = contract.provider.roles?.some(role => role.name === 'BUSINESS') || false;
        
        // Calcular las comisiones basadas en el precio actual
        const acceptCommissions = this.calculateCommissions(
          contract.currentPrice,
          isProviderCompany
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
        await this.sendContractPush(
          contract,
          contract.client.id,
          "Solicitud aceptada",
          `Tu solicitud para "${contract.publication.title}" fue aceptada.`,
        );
        try {
          await this.paymentService.ensureWompiPaymentForContract(contract.id);
        } catch (error) {
          console.error("Error creating payment link:", error);
        }
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
        await this.sendContractPush(
          contract,
          contract.client.id,
          "Solicitud rechazada",
          `Tu solicitud para "${contract.publication.title}" fue rechazada.`,
        );
        break;

      case ContractStatus.NEGOTIATING: {
        if (
          typeof data.counterOffer === "number" &&
          data.counterOffer < this.MIN_SERVICE_PRICE
        ) {
          throw new BadRequestException(
            `El monto minimo del servicio es ${this.MIN_SERVICE_PRICE}`,
          );
        }

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
        await this.sendContractPush(
          contract,
          contract.client.id,
          "Nueva propuesta",
          `El proveedor envió una nueva propuesta para "${contract.publication.title}".`,
        );
        break;
      }
    }

    return await this.contractRepository.save(contract);
  }

  private generateNumericOTP(length: number): string {
    const max = 10 ** length;
    return Math.floor(Math.random() * max)
      .toString()
      .padStart(length, "0");
  }

  private hashOTP(contractId: string, otpCode: string): string {
    return createHash("sha256")
      .update(`${contractId}:${otpCode}`)
      .digest("hex");
  }

  private isWompiApproved(wompiResponse: any): boolean {
    if (!wompiResponse) {
      return false;
    }

    try {
      const parsed =
        typeof wompiResponse === "string"
          ? JSON.parse(wompiResponse)
          : wompiResponse;
      const status = String(parsed?.status || "").toUpperCase();
      return status === "APPROVED" || status === "FINISHED";
    } catch (error) {
      return false;
    }
  }

  private getReadablePaymentStatus(payment?: PaymentTransaction | null): string | null {
    if (!payment) {
      return null;
    }
    if (payment.status) {
      return String(payment.status);
    }
    if (this.isWompiApproved(payment.wompi_response)) {
      return "APPROVED";
    }
    return null;
  }

  private isPaymentApproved(payment: PaymentTransaction): boolean {
    return (
      payment.paid_at !== null && payment.paid_at !== undefined ||
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.FINISHED ||
      this.isWompiApproved(payment.wompi_response)
    );
  }

  private async decorateContractReadModel(contract: Contract): Promise<any> {
    const now = new Date();
    const [payments, latestUnusedOTP] = await Promise.all([
      this.paymentService.findByContract(contract.id),
      this.otpRepository.findOne({
        where: { contract: { id: contract.id }, isUsed: false },
        order: { createdAt: "DESC" },
      }),
    ]);

    const latestPayment = payments[0] ?? null;
    const approvedPayment =
      payments.find((payment) => this.isPaymentApproved(payment)) ?? null;
    const otpExpiresAt =
      latestUnusedOTP?.expiresAt && latestUnusedOTP.expiresAt > now
        ? latestUnusedOTP.expiresAt
        : null;

    return {
      ...contract,
      otpExpiresAt,
      paymentStatus:
        this.getReadablePaymentStatus(approvedPayment) ||
        this.getReadablePaymentStatus(latestPayment),
      paidAt: approvedPayment?.paid_at || null,
    };
  }

  private assertContractCanGenerateOTP(contract: Contract): void {
    if (contract.status === ContractStatus.COMPLETED) {
      throw new ConflictException({
        errorCode: "CONTRACT_ALREADY_COMPLETED",
        message: "El contrato ya está completado",
      });
    }

    if (contract.status === ContractStatus.CANCELLED || contract.cancelledAt) {
      throw new BadRequestException(
        "No se puede generar OTP para contratos cancelados",
      );
    }

    if (contract.otpVerified) {
      throw new ConflictException({
        errorCode: "OTP_ALREADY_VERIFIED",
        message: "El contrato ya tiene OTP verificado",
      });
    }

    if (
      contract.status !== ContractStatus.ACCEPTED &&
      contract.status !== ContractStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        "Solo se puede generar OTP en contratos accepted o in_progress",
      );
    }
  }

  private assertClientRole(contract: Contract, userId?: number): void {
    if (!userId || contract.client.id !== userId) {
      throw new ForbiddenException({
        errorCode: "OTP_ROLE_NOT_ALLOWED",
        message: "Solo el cliente del contrato puede generar o reenviar OTP",
      });
    }
  }

  private assertProviderRole(contract: Contract, userId?: number): void {
    if (!userId || contract.provider.id !== userId) {
      throw new ForbiddenException({
        errorCode: "OTP_ROLE_NOT_ALLOWED",
        message: "Solo el proveedor del contrato puede verificar OTP",
      });
    }
  }

  private async createOTPForContract(
    contract: Contract,
    otpLength: number,
  ): Promise<{
    contractId: string;
    otpCode: string;
    expiresAt: string;
    otpLength: number;
  }> {
    const normalizedLength = otpLength || this.DEFAULT_OTP_LENGTH;

    // Se invalida cualquier OTP activo antes de crear uno nuevo.
    await this.otpRepository.update(
      { contract: { id: contract.id }, isUsed: false },
      { isUsed: true },
    );

    const otpCode = this.generateNumericOTP(normalizedLength);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.OTP_EXPIRES_HOURS);

    const otp = this.otpRepository.create({
      contract,
      code: null,
      codeHash: this.hashOTP(contract.id, otpCode),
      otpLength: normalizedLength,
      attempts: 0,
      maxAttempts: this.OTP_MAX_ATTEMPTS,
      isUsed: false,
      expiresAt,
    });

    await this.otpRepository.save(otp);

    return {
      contractId: contract.id,
      otpCode,
      expiresAt: expiresAt.toISOString(),
      otpLength: normalizedLength,
    };
  }

  /**
   * Genera OTP para un contrato pagado (cliente).
   */
  async generateContractOTP(
    contractId: string,
    userId?: number,
    length?: number,
  ): Promise<{
    contractId: string;
    otpCode: string;
    expiresAt: string;
    otpLength: number;
  }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    this.assertClientRole(contract, userId);
    this.assertContractCanGenerateOTP(contract);

    const payments = await this.paymentService.findByContract(contract.id);
    const hasApprovedPayment = payments.some((payment) =>
      this.isPaymentApproved(payment),
    );

    if (!hasApprovedPayment) {
      throw new ConflictException({
        errorCode: "OTP_NOT_ALLOWED_UNPAID",
        message: "El contrato aún no tiene un pago aprobado",
      });
    }

    const response = await this.createOTPForContract(
      contract,
      length || this.DEFAULT_OTP_LENGTH,
    );

    await this.sendContractPush(
      contract,
      contract.provider.id,
      "Cliente generó código de verificación",
      `El cliente generó un código OTP para "${contract.publication?.title || "el contrato"}".`,
    );

    return response;
  }

  /**
   * Reenvía OTP para un contrato pagado (cliente).
   */
  async resendContractOTP(
    contractId: string,
    userId?: number,
    length?: number,
  ): Promise<{
    contractId: string;
    otpCode: string;
    expiresAt: string;
    otpLength: number;
  }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    this.assertClientRole(contract, userId);
    this.assertContractCanGenerateOTP(contract);

    const payments = await this.paymentService.findByContract(contract.id);
    const hasApprovedPayment = payments.some((payment) =>
      this.isPaymentApproved(payment),
    );

    if (!hasApprovedPayment) {
      throw new ConflictException({
        errorCode: "OTP_NOT_ALLOWED_UNPAID",
        message: "El contrato aún no tiene un pago aprobado",
      });
    }

    const response = await this.createOTPForContract(
      contract,
      length || this.DEFAULT_OTP_LENGTH,
    );

    await this.sendContractPush(
      contract,
      contract.provider.id,
      "Cliente regeneró código de verificación",
      `El cliente regeneró el código OTP para "${contract.publication?.title || "el contrato"}".`,
    );

    return response;
  }

  /**
   * Verifica OTP (proveedor) y completa el contrato en una transacción.
   */
  async verifyContractOTP(
    contractId: string,
    otpCode: string,
    userId?: number,
  ): Promise<{ isValid: boolean; contract: any }> {
    const updatedContract = await this.contractRepository.manager.transaction(
      async (manager) => {
        const contractRepository = manager.getRepository(Contract);
        const otpRepository = manager.getRepository(ContractOTP);

        const contract = await contractRepository.findOne({
          where: { id: contractId, deleted_at: null },
          relations: ["client", "provider", "publication"],
        });

        if (!contract) {
          throw new NotFoundException("Contrato no encontrado");
        }

        this.assertProviderRole(contract, userId);

        if (contract.otpVerified) {
          throw new ConflictException({
            errorCode: "OTP_ALREADY_VERIFIED",
            message: "El contrato ya tiene OTP verificado",
          });
        }

        if (contract.status === ContractStatus.COMPLETED) {
          throw new ConflictException({
            errorCode: "CONTRACT_ALREADY_COMPLETED",
            message: "El contrato ya está completado",
          });
        }

        if (contract.status === ContractStatus.CANCELLED || contract.cancelledAt) {
          throw new BadRequestException(
            "No se puede verificar OTP en un contrato cancelado",
          );
        }

        const latestOTP = await otpRepository.findOne({
          where: { contract: { id: contractId }, isUsed: false },
          order: { createdAt: "DESC" },
        });

        if (!latestOTP) {
          throw new UnprocessableEntityException({
            isValid: false,
            message: "Código inválido",
            remainingAttempts: 0,
          });
        }

        const now = new Date();
        if (latestOTP.expiresAt && latestOTP.expiresAt < now) {
          latestOTP.isUsed = true;
          await otpRepository.save(latestOTP);
          throw new GoneException({
            errorCode: "OTP_EXPIRED",
            message: "El código OTP expiró",
          });
        }

        const maxAttempts = latestOTP.maxAttempts || this.OTP_MAX_ATTEMPTS;
        if ((latestOTP.attempts || 0) >= maxAttempts) {
          latestOTP.isUsed = true;
          await otpRepository.save(latestOTP);
          throw new UnprocessableEntityException({
            isValid: false,
            message: "Código inválido",
            remainingAttempts: 0,
          });
        }

        const inputHash = this.hashOTP(contract.id, otpCode);
        const storedHash = latestOTP.codeHash;
        const hashMatches =
          !!storedHash &&
          storedHash.length === inputHash.length &&
          timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));

        const legacyMatches = !storedHash && latestOTP.code === otpCode;
        const isValid = hashMatches || legacyMatches;

        if (!isValid) {
          latestOTP.attempts = (latestOTP.attempts || 0) + 1;
          const remainingAttempts = Math.max(
            maxAttempts - latestOTP.attempts,
            0,
          );

          if (remainingAttempts === 0) {
            latestOTP.isUsed = true;
          }
          await otpRepository.save(latestOTP);

          throw new UnprocessableEntityException({
            isValid: false,
            message: "Código inválido",
            remainingAttempts,
          });
        }

        latestOTP.isUsed = true;
        await otpRepository.save(latestOTP);

        contract.otpVerified = true;
        contract.otpVerifiedAt = now;
        contract.status = ContractStatus.COMPLETED;
        if (!contract.completedAt) {
          contract.completedAt = now;
        }

        return await contractRepository.save(contract);
      },
    );

    await Promise.all([
      this.sendContractPush(
        updatedContract,
        updatedContract.client.id,
        "Contrato completado",
        `El contrato "${updatedContract.publication?.title || updatedContract.id}" fue completado.`,
      ),
      this.sendContractPush(
        updatedContract,
        updatedContract.provider.id,
        "Contrato completado",
        `El contrato "${updatedContract.publication?.title || updatedContract.id}" fue completado.`,
      ),
    ]);

    return {
      isValid: true,
      contract: await this.decorateContractReadModel(updatedContract),
    };
  }

  private async sendContractPush(
    contract: Contract,
    recipientId: number,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      await this.pushService.sendToUser(recipientId, {
        title,
        body,
        data: {
          type: "contract",
          contractId: contract.id,
          status: contract.status,
        },
      });
    } catch (error) {
      console.error("Error sending contract push notification:", error);
    }
  }
}
