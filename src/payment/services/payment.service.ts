import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentTransaction } from "../entities/payment-transaction.entity";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { UpdatePaymentDto } from "../dto/update-payment.dto";
import { UpdatePaymentStatusDto } from "../dto/update-payment-status.dto";
import {
  PaymentHistoryDto,
  PaymentHistoryType,
} from "../dto/payment-history.dto";
import { AdminPaymentFilterDto } from "../dto/admin-payment-filter.dto";
import { WompiService } from "./wompi.service";
import { PaymentMethod, PaymentStatus } from "../../enums/paymentMethod.enum";
import { User } from "../../user/entities/user.entity";
import { Contract } from "../../contract/entities/contract.entity";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class PaymentService {
  public wompiService: WompiService;
  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>, // eslint-disable-line no-unused-vars
    wompiService: WompiService,
  ) {
    this.wompiService = wompiService;
  }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    payerId: number,
  ): Promise<PaymentTransaction> {
    const {
      contract_id,
      payee_id,
      acceptance_token, // eslint-disable-line no-unused-vars
      accept_personal_auth, // eslint-disable-line no-unused-vars
      ...paymentData
    } = createPaymentDto;

    // Verify payer exists
    const payer = await this.userRepository.findOne({ where: { id: payerId } });
    if (!payer) {
      throw new NotFoundException(`Payer with ID ${payerId} not found`);
    }

    // Verify payee exists
    const payee = await this.userRepository.findOne({
      where: { id: payee_id },
    });
    if (!payee) {
      throw new NotFoundException(`Payee with ID ${payee_id} not found`);
    }

    // Verify work contract exists
    const contract = await this.contractRepository.findOne({
      where: { id: contract_id },
      relations: ["client", "provider"],
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contract_id} not found`);
    }

    // Verify payer is the client of the work contract
    if (contract.client.id !== payerId) {
      throw new BadRequestException(
        "Only the client can make payments for this contract",
      );
    }

    // Verify payee is the provider of the work contract
    if (contract.provider.id !== payee_id) {
      throw new BadRequestException(
        "Payee must be the provider of the work contract",
      );
    }

    // Create payment transaction
    const paymentTransaction = this.paymentTransactionRepository.create({
      ...paymentData,
      payer,
      payee,
      contract: contract,
      status: PaymentStatus.PENDING,
      reference: paymentData.reference || `PAY-${Date.now()}`,
    });

    await this.paymentTransactionRepository.save(paymentTransaction);

    // MODO MOCK: Si está habilitado, simular pago exitoso inmediatamente
    const MOCK_PAYMENT_SUCCESS = process.env.MOCK_PAYMENT_SUCCESS === "true";
    if (
      MOCK_PAYMENT_SUCCESS &&
      paymentData.payment_method === PaymentMethod.Wompi
    ) {
      paymentTransaction.status = PaymentStatus.COMPLETED;
      await this.paymentTransactionRepository.save(paymentTransaction);
      await this.enableRatingAfterPayment(paymentTransaction);
    }

    // If payment method is Wompi, create Wompi transaction
    if (paymentData.payment_method === PaymentMethod.Wompi) {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL;

      const paymentLink = await this.wompiService.createPaymentLink({
        name: contract.publication?.title || "Pago de servicio",
        description: paymentData.description || "Pago de servicio",
        amount: paymentData.amount,
        currency: paymentData.currency,
        redirect_url: `${backendUrl}/suarec/payments/redirect-direct/${paymentTransaction.id}`,
        single_use: true,
        collect_shipping: false,
      });

      paymentTransaction.wompi_payment_link = `https://checkout.wompi.co/l/${paymentLink.id}`;
      paymentTransaction.wompi_payment_link_id = paymentLink.id;

      const savedTransaction = // eslint-disable-line no-unused-vars
        await this.paymentTransactionRepository.save(paymentTransaction);
    }

    return this.findOne(paymentTransaction.id);
  }

  private async processWompiPayment(
    paymentTransaction: PaymentTransaction,
    acceptance_token?: string,
    accept_personal_auth?: string,
  ): Promise<void> {
    try {
      if (!this.wompiService.isConfigured()) {
        throw new Error("Wompi is not configured");
      }

      // Use the payer's email from the payment transaction
      const customerEmail = paymentTransaction.payer.email;

      if (!customerEmail) {
        throw new Error("Customer email is required for payment processing");
      }

      if (!acceptance_token) {
        throw new Error("Acceptance token is required");
      }

      if (!accept_personal_auth) {
        throw new Error("Personal data authorization token is required");
      }

      const wompiResponse = await this.wompiService.createTransaction(
        paymentTransaction.amount,
        paymentTransaction.currency,
        paymentTransaction.reference,
        customerEmail, // This will be cleaned in WompiService
        `${process.env.FRONTEND_URL}/payments/success?transaction_id=${paymentTransaction.id}`,
        paymentTransaction.wompi_payment_type,
        undefined, // installments
        acceptance_token,
        accept_personal_auth,
      );

      // Update payment transaction with Wompi data
      await this.paymentTransactionRepository.update(paymentTransaction.id, {
        wompi_transaction_id: wompiResponse.data.id,
        wompi_acceptance_token: wompiResponse.data.acceptance_token,
        wompi_payment_link: wompiResponse.data.payment_link,
        wompi_response: JSON.parse(JSON.stringify(wompiResponse.data)),
        status: PaymentStatus.PROCESSING,
      });
    } catch (error) {
      console.error("Error in processWompiPayment:", error); // eslint-disable-line no-console
      // Update payment transaction with error
      await this.paymentTransactionRepository.update(paymentTransaction.id, {
        status: PaymentStatus.FAILED,
        error_message: `Failed to create Wompi transaction: ${error.message}`,
      });
      throw error;
    }
  }

  async findAll(): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      relations: ["payer", "payee", "contract"],
    });
  }

  async findOne(id: string): Promise<PaymentTransaction> {
    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id },
      relations: ["payer", "payee", "contract"],
    });

    if (!paymentTransaction) {
      throw new NotFoundException(
        `Payment transaction with ID ${id} not found`,
      );
    }

    return paymentTransaction;
  }

  async findByUser(userId: number): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: [{ payer: { id: userId } }, { payee: { id: userId } }],
      relations: ["payer", "payee", "contract"],
      order: { created_at: "DESC" },
    });
  }

  async findByContract(contractId: string): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: { contract: { id: contractId } },
      relations: ["payer", "payee", "contract"],
      order: { created_at: "DESC" },
    });
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentTransaction> {
    const paymentTransaction = await this.findOne(id);

    Object.assign(paymentTransaction, updatePaymentDto);
    await this.paymentTransactionRepository.save(paymentTransaction);

    return paymentTransaction;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdatePaymentStatusDto,
  ): Promise<PaymentTransaction> {
    const paymentTransaction = await this.findOne(id);

    // Actualizar el status y el comentario
    paymentTransaction.status = updateStatusDto.status;

    // Guardar la fecha de actualización automáticamente por el decorator
    await this.paymentTransactionRepository.save(paymentTransaction);

    return this.findOne(id);
  }

  async processWompiWebhook(webhookData: any): Promise<void> {
    try {
      const { event, data } = webhookData;
      console.log("=== WEBHOOK WOMPI RECIBIDO ==="); // eslint-disable-line no-console
      console.log("Event:", event); // eslint-disable-line no-console
      console.log("Data structure:", Object.keys(data)); // eslint-disable-line no-console

      // Extraer el payment_link_id del webhook
      let paymentLinkId = null;
      let transactionStatus = null;

      if (data.transaction) {
        // Estructura del webhook real de Wompi
        paymentLinkId = data.transaction.payment_link_id;
        transactionStatus = data.transaction.status;
      } else if (data.payment_link_id) {
        // Estructura directa
        paymentLinkId = data.payment_link_id;
        transactionStatus = data.status;
      } else {
        // Estructura alternativa usando ID
        paymentLinkId = data.id;
        transactionStatus = data.status;
      }

      if (!paymentLinkId) {
        throw new Error("Payment link ID not found in webhook data");
      }

      // Buscar por Payment Link ID
      const paymentTransaction =
        await this.paymentTransactionRepository.findOne({
          where: { wompi_payment_link_id: paymentLinkId },
          relations: ["payer", "payee", "contract"],
        });

      if (!paymentTransaction) {
        // Buscar por transaction ID como alternativa
        const altTransaction = await this.paymentTransactionRepository.findOne({
          where: { wompi_transaction_id: paymentLinkId },
          relations: ["payer", "payee", "contract"],
        });

        if (!altTransaction) {
          throw new Error(
            `Payment transaction not found for Wompi ID: ${paymentLinkId}`,
          );
        }

        return await this.updatePaymentStatus(
          altTransaction,
          transactionStatus,
        );
      }

      // Update payment status based on webhook event
      switch (event) {
        case "transaction.updated":
          await this.updatePaymentStatus(paymentTransaction, transactionStatus);
          break;
        case "transaction.paid":
          await this.updatePaymentStatus(paymentTransaction, "APPROVED");
          break;
        case "transaction.declined":
          await this.updatePaymentStatus(paymentTransaction, "DECLINED");
          break;
        case "transaction.pending":
          await this.updatePaymentStatus(paymentTransaction, "PENDING");
          break;
        default:
          console.log(`⚠️ Evento de webhook no manejado: ${event}`); // eslint-disable-line no-console
          // Aún así, actualizar con el estado recibido
          if (transactionStatus) {
            await this.updatePaymentStatus(
              paymentTransaction,
              transactionStatus,
            );
          }
      }
    } catch (error) {
      console.error("❌ Error processing Wompi webhook:", error); // eslint-disable-line no-console
      throw error;
    }
  }

  private async updatePaymentStatus(
    paymentTransaction: PaymentTransaction,
    wompiStatus: string,
  ): Promise<void> {
    console.log("=== ACTUALIZANDO ESTADO DE PAGO ==="); // eslint-disable-line no-console
    console.log("Transacción ID:", paymentTransaction.id); // eslint-disable-line no-console
    console.log("Estado actual:", paymentTransaction.status); // eslint-disable-line no-console
    console.log("Estado de Wompi:", wompiStatus); // eslint-disable-line no-console

    // MODO MOCK: Si está habilitado, simular pago exitoso
    const MOCK_PAYMENT_SUCCESS = process.env.MOCK_PAYMENT_SUCCESS === "true";
    if (MOCK_PAYMENT_SUCCESS) {
      console.log("🎭 MODO MOCK ACTIVADO - Simulando pago exitoso"); // eslint-disable-line no-console
      wompiStatus = "APPROVED";
    }

    let newStatus: PaymentStatus;

    switch (wompiStatus) {
      case "APPROVED":
      case "COMPLETED":
        newStatus = PaymentStatus.COMPLETED;
        break;
      case "DECLINED":
      case "FAILED":
      case "ERROR":
        newStatus = PaymentStatus.FAILED;
        break;
      case "PENDING":
        newStatus = PaymentStatus.PROCESSING;
        break;
      default:
        newStatus = PaymentStatus.PENDING;
    }

    await this.update(paymentTransaction.id, {
      status: newStatus,
      wompi_response: JSON.stringify({
        status: wompiStatus,
        updated_at: new Date(),
      }),
    });

    // Si el pago fue completado, habilitar calificación
    if (newStatus === PaymentStatus.COMPLETED) {
      // Recargar la transacción con todas las relaciones necesarias
      const fullPaymentTransaction =
        await this.paymentTransactionRepository.findOne({
          where: { id: paymentTransaction.id },
          relations: ["payer", "payee", "contract"],
        });

      if (fullPaymentTransaction) {
        await this.enableRatingAfterPayment(fullPaymentTransaction);
      }
    }
  }

  private async enableRatingAfterPayment(
    paymentTransaction: PaymentTransaction,
  ): Promise<void> {
    try {
      console.log("⭐ Habilitando calificación después del pago exitoso"); // eslint-disable-line no-console
      console.log("Transacción ID:", paymentTransaction.id); // eslint-disable-line no-console

      // Validar que las relaciones estén cargadas
      if (!paymentTransaction.payer) {
        console.error("❌ Payer no está cargado en la transacción"); // eslint-disable-line no-console
        throw new Error("Payer relation not loaded");
      }

      if (!paymentTransaction.payee) {
        console.error("❌ Payee no está cargado en la transacción"); // eslint-disable-line no-console
        throw new Error("Payee relation not loaded");
      }

      console.log("Cliente (Payer) ID:", paymentTransaction.payer.id); // eslint-disable-line no-console
      console.log("Proveedor (Payee) ID:", paymentTransaction.payee.id); // eslint-disable-line no-console
      console.log("Contract ID:", paymentTransaction.contract?.id); // eslint-disable-line no-console

      // SOLO el cliente (payer) puede calificar al proveedor (payee)
      // El sistema de ratings está diseñado para que el cliente califique el servicio recibido
      console.log("✅ Calificación habilitada para el cliente calificar al proveedor"); // eslint-disable-line no-console
      console.log(`   📝 Cliente ID ${paymentTransaction.payer.id} puede calificar a Proveedor ID ${paymentTransaction.payee.id}`); // eslint-disable-line no-console
    } catch (error) {
      console.error("❌ Error habilitando calificación:", error); // eslint-disable-line no-console
      throw new BadRequestException("Error enabling rating after payment");
    }
  }

  async remove(id: string): Promise<void> {
    const paymentTransaction = await this.findOne(id);
    await this.paymentTransactionRepository.remove(paymentTransaction);
  }

  async getPaymentHistory(
    userId: number,
    historyDto: PaymentHistoryDto,
  ): Promise<PaginationResponse<PaymentTransaction>> {
    const { page, limit, type, status, startDate, endDate } = historyDto;
    const skip = (page - 1) * limit;

    // Construir query base con QueryBuilder para mejor control
    const queryBuilder = this.paymentTransactionRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.payer", "payer")
      .leftJoinAndSelect("payment.payee", "payee")
      .leftJoinAndSelect("payment.contract", "contract")
      .leftJoinAndSelect("contract.publication", "publication");

    // Aplicar filtros por tipo de historial
    if (type === PaymentHistoryType.SENT) {
      // Solo pagos enviados (usuario como payer)
      queryBuilder.where("payer.id = :userId", { userId });
    } else if (type === PaymentHistoryType.RECEIVED) {
      // Solo pagos recibidos (usuario como payee)
      queryBuilder.where("payee.id = :userId", { userId });
    } else {
      // Todos los pagos (enviados y recibidos)
      queryBuilder.where("(payer.id = :userId OR payee.id = :userId)", {
        userId,
      });
    }

    // Filtro por estado
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

    // Filtros por fecha
    if (startDate && endDate) {
      queryBuilder.andWhere(
        "payment.created_at BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate + " 23:59:59"), // Incluir todo el día
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere("payment.created_at >= :startDate", {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere("payment.created_at <= :endDate", {
        endDate: new Date(endDate + " 23:59:59"),
      });
    }

    // Ordenar por fecha más reciente
    queryBuilder.orderBy("payment.created_at", "DESC");

    // Ejecutar queries de datos y conteo en paralelo
    const [payments, total] = await Promise.all([
      queryBuilder.skip(skip).take(limit).getMany(),
      queryBuilder.getCount(),
    ]);

    // Enriquecer los datos con información adicional
    const enrichedPayments = payments.map((payment) => ({
      ...payment,
      // Agregar flag para identificar si es enviado o recibido
      isOutgoing: payment.payer.id === userId,
      isIncoming: payment.payee.id === userId,
      // Información del contrato
      contractTitle: payment.contract?.publication?.title || "Sin título",
      // Información del otro usuario
      otherUser: payment.payer.id === userId ? payment.payee : payment.payer,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedPayments as any,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getAllPaymentsForAdmin(
    filterDto: AdminPaymentFilterDto,
  ): Promise<PaginationResponse<PaymentTransaction>> {
    const {
      page,
      limit,
      status,
      paymentMethod,
      payerId,
      payeeId,
      startDate,
      endDate,
      contractId,
      minAmount,
      maxAmount,
    } = filterDto;
    const skip = (page - 1) * limit;

    // Construir query base con QueryBuilder
    const queryBuilder = this.paymentTransactionRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.payer", "payer")
      .leftJoinAndSelect("payment.payee", "payee")
      .leftJoinAndSelect("payment.contract", "contract")
      .leftJoinAndSelect("contract.publication", "publication");

    // Filtro por estado
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

    // Filtro por método de pago
    if (paymentMethod) {
      queryBuilder.andWhere("payment.payment_method = :paymentMethod", {
        paymentMethod,
      });
    }

    // Filtro por payer ID
    if (payerId) {
      queryBuilder.andWhere("payer.id = :payerId", { payerId });
    }

    // Filtro por payee ID
    if (payeeId) {
      queryBuilder.andWhere("payee.id = :payeeId", { payeeId });
    }

    // Filtro por contrato
    if (contractId) {
      queryBuilder.andWhere("contract.id = :contractId", { contractId });
    }

    // Filtros por monto
    if (minAmount && maxAmount) {
      queryBuilder.andWhere(
        "payment.amount BETWEEN :minAmount AND :maxAmount",
        {
          minAmount,
          maxAmount,
        },
      );
    } else if (minAmount) {
      queryBuilder.andWhere("payment.amount >= :minAmount", { minAmount });
    } else if (maxAmount) {
      queryBuilder.andWhere("payment.amount <= :maxAmount", { maxAmount });
    }

    // Filtros por fecha
    if (startDate && endDate) {
      queryBuilder.andWhere(
        "payment.created_at BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate + " 23:59:59"), // Incluir todo el día
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere("payment.created_at >= :startDate", {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere("payment.created_at <= :endDate", {
        endDate: new Date(endDate + " 23:59:59"),
      });
    }

    // Ordenar por fecha más reciente
    queryBuilder.orderBy("payment.created_at", "DESC");

    // Ejecutar queries de datos y conteo en paralelo
    const [payments, total] = await Promise.all([
      queryBuilder.skip(skip).take(limit).getMany(),
      queryBuilder.getCount(),
    ]);

    // Enriquecer los datos con información adicional para admin
    const enrichedPayments = payments.map((payment) => ({
      ...payment,
      // Información del contrato
      contractTitle: payment.contract?.publication?.title || "Sin título",
      // Información de los usuarios
      payerInfo: {
        id: payment.payer.id,
        name: payment.payer.name,
        email: payment.payer.email,
      },
      payeeInfo: {
        id: payment.payee.id,
        name: payment.payee.name,
        email: payment.payee.email,
      },
      // Estadísticas adicionales
      daysSinceCreated: Math.floor(
        (new Date().getTime() - new Date(payment.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedPayments as any,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Genera URLs de redirección basadas en el estado del pago
   */
  private generateRedirectUrls(transactionId: string) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return {
      success: `${frontendUrl}/payments/success?transaction_id=${transactionId}`,
      failed: `${frontendUrl}/payments/failed?transaction_id=${transactionId}`,
      pending: `${frontendUrl}/payments/pending?transaction_id=${transactionId}`,
    };
  }

  /**
   * Maneja la redirección del usuario después del pago
   */
  async handlePaymentRedirect(
    transactionId: string,
    status: PaymentStatus,
  ): Promise<string> {
    const urls = this.generateRedirectUrls(transactionId);

    switch (status) {
      case PaymentStatus.COMPLETED:
        return urls.success;
      case PaymentStatus.FAILED:
        return urls.failed;
      case PaymentStatus.PROCESSING:
      case PaymentStatus.PENDING:
        return urls.pending;
      default:
        return urls.pending;
    }
  }

  async getPaymentStatusByContract(contractId: string): Promise<{
    contractId: string;
    hasPendingPayments: boolean;
    hasCompletedPayments: boolean;
    hasActivePayments: boolean; // pending, processing, or completed
    latestStatus?: PaymentStatus;
  }> {
    // Buscar todos los pagos del contrato
    const payments = await this.paymentTransactionRepository.find({
      where: { contract: { id: contractId } },
      order: { created_at: "DESC" },
    });

    if (payments.length === 0) {
      return {
        contractId,
        hasPendingPayments: false,
        hasCompletedPayments: false,
        hasActivePayments: false,
      };
    }

    const hasPendingPayments = payments.some(
      (p) =>
        p.status === PaymentStatus.PENDING ||
        p.status === PaymentStatus.PROCESSING,
    );

    const hasCompletedPayments = payments.some(
      (p) =>
        p.status === PaymentStatus.COMPLETED ||
        p.status === PaymentStatus.FINISHED,
    );

    const hasActivePayments = payments.some(
      (p) =>
        p.status === PaymentStatus.PENDING ||
        p.status === PaymentStatus.PROCESSING ||
        p.status === PaymentStatus.COMPLETED ||
        p.status === PaymentStatus.FINISHED,
    );

    // El pago más reciente
    const latestPayment = payments[0];

    return {
      contractId,
      hasPendingPayments,
      hasCompletedPayments,
      hasActivePayments,
      latestStatus: latestPayment.status,
    };
  }
}
