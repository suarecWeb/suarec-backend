import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { PaymentMethod } from "../enums/paymentMethod.enum";
import { BalanceService } from "../user/services/balance.service";

@Injectable()
export class ContractService {
  async updateContract(contractId: string, userId: number, updateContractDto: any): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id: contractId }, relations: ["provider", "client"] });
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
    Object.assign(contract, updateContractDto);
    const updatedContract = await this.contractRepository.save(contract);
    if (updatedContract.status === ContractStatus.ACCEPTED) {
      try {
        await this.paymentService.ensureWompiPaymentForContract(updatedContract.id);
      } catch (error) {
        console.error("Error creating payment link:", error);
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
  private readonly SUAREC_COMMISSION_RATE = 0.12; // 12%
  private readonly MIN_SUAREC_COMMISSION = 7000;
  private readonly MIN_SERVICE_PRICE = 20000;
  private readonly TAX_RATE = 0.19; // 19% IVA

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
        relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
      }),
      this.contractRepository.find({
        where: { provider: { id: userId }, deleted_at: null }, // Solo contratos activos
        relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
      }),
    ]);

    return { asClient, asProvider };
  }

  async getContractById(contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null }, // Solo contratos activos
      relations: ["publication", "client", "client.roles", "client.company", "provider", "provider.roles", "provider.company", "bids", "bids.bidder"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    return contract;
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
    return await this.contractRepository.save(contract);
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
        break;
      }
    }

    return await this.contractRepository.save(contract);
  }

  /**
   * Genera un código OTP de 6 dígitos
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Genera un OTP para un contrato completado
   */
  async generateContractOTP(contractId: string, userId?: number): Promise<ContractOTP> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.status !== ContractStatus.COMPLETED) {
      throw new BadRequestException("Solo se puede generar OTP para contratos completados");
    }

    // Si se proporciona userId, verificar que sea el cliente del contrato
    if (userId && contract.client.id !== userId) {
      throw new BadRequestException("Solo el cliente del contrato puede generar el OTP");
    }

    // Verificar si ya existe un OTP válido para este contrato
    const existingOTP = await this.otpRepository.findOne({
      where: {
        contract: { id: contractId },
        isUsed: false,
        expiresAt: Not(IsNull()),
      },
      order: { createdAt: "DESC" },
    });

    if (existingOTP && existingOTP.expiresAt > new Date()) {
      throw new BadRequestException("Ya existe un OTP válido para este contrato");
    }

    // Generar nuevo OTP
    const otpCode = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

    const otp = this.otpRepository.create({
      contract,
      code: otpCode,
      expiresAt,
    });

    const savedOTP = await this.otpRepository.save(otp);

    // Enviar OTP por email al cliente
    try {
      await this.emailService.sendOTPNotification(
        contract.client.email,
        contract.client.name,
        otpCode,
        contract.publication.title,
        contract.provider.name,
      );
    } catch (error) {
      console.error("Error sending OTP email:", error);
    }

    return savedOTP;
  }

  /**
   * Verifica un OTP para un contrato
   */
  async verifyContractOTP(contractId: string, otpCode: string, userId?: number): Promise<{ isValid: boolean; message: string }> {
    
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }


    if (contract.status !== ContractStatus.COMPLETED) {
      throw new BadRequestException("Solo se puede verificar OTP para contratos completados");
    }

    // Si se proporciona userId, verificar que sea el cliente del contrato
    if (userId && contract.client.id !== userId) {
      throw new BadRequestException("Solo el cliente del contrato puede verificar el OTP");
    }

    
    const otp = await this.otpRepository.findOne({
      where: {
        contract: { id: contractId },
        code: otpCode,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });

    if (!otp) {
      return { isValid: false, message: "Código OTP inválido" };
    }

    if (otp.expiresAt < new Date()) {
      return { isValid: false, message: "Código OTP expirado" };
    }

    // Marcar OTP como usado
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    try {
      // Marcar el contrato como OTP verificado
      contract.otpVerified = true;
      await this.contractRepository.save(contract);

      // Procesar balance: Cliente recibe saldo negativo, Proveedor recibe saldo positivo
      await this.balanceService.processOTPVerificationBalance(contract);

      return { isValid: true, message: "OTP verificado correctamente" };
    } catch (error) {
      console.error("Error al procesar verificación OTP:", error);
      // Revertir el estado del contrato si hay error en el balance
      contract.otpVerified = false;
      await this.contractRepository.save(contract);
      throw new BadRequestException("Error al procesar la verificación OTP");
    }
  }

  /**
   * Reenvía un OTP para un contrato
   */
  async resendContractOTP(contractId: string, userId?: number): Promise<ContractOTP> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider", "publication"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    if (contract.status !== ContractStatus.COMPLETED) {
      throw new BadRequestException("Solo se puede reenviar OTP para contratos completados");
    }

    // Si se proporciona userId, verificar que sea el cliente del contrato
    if (userId && contract.client.id !== userId) {
      throw new BadRequestException("Solo el cliente del contrato puede reenviar el OTP");
    }

    // Invalidar OTPs anteriores
    await this.otpRepository.update(
      { contract: { id: contractId }, isUsed: false },
      { isUsed: true }
    );

    // Generar nuevo OTP
    return await this.generateContractOTP(contractId, userId);
  }
}
