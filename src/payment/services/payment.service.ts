import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
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
import { ContractService } from "../../contract/contract.service";
import { BalanceService } from "../../user/services/balance.service";
import {
  PlatformFeeLedger,
  PlatformFeeStatus,
} from "../../fees/platform-fee-ledger.entity";

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
    @InjectRepository(PlatformFeeLedger)
    private platformFeeLedgerRepository: Repository<PlatformFeeLedger>, // eslint-disable-line no-unused-vars
    wompiService: WompiService,
    @Inject(forwardRef(() => ContractService))
    private contractService: ContractService, // eslint-disable-line no-unused-vars
    @Inject(forwardRef(() => BalanceService))
    private balanceService: BalanceService, // eslint-disable-line no-unused-vars
  ) {
    this.wompiService = wompiService;
  }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    payerId: number,
  ): Promise<PaymentTransaction> {
    
    console.log('🚀 ===== INICIO createPayment DEBUG =====');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔧 Platform:', process.platform);
    
    try {
      console.log('📥 Input received:');
      console.log('  createPaymentDto:', JSON.stringify(createPaymentDto, null, 2));
      console.log('  payerId:', payerId);
      console.log('  payerId type:', typeof payerId);

      const {
        contract_id,
        payee_id,
        acceptance_token,
        accept_personal_auth,
        ...paymentData
      } = createPaymentDto;

      console.log('📦 Destructured data:');
      console.log('  contract_id:', contract_id, 'type:', typeof contract_id);
      console.log('  payee_id:', payee_id, 'type:', typeof payee_id);
      console.log('  acceptance_token exists:', !!acceptance_token);
      console.log('  accept_personal_auth exists:', !!accept_personal_auth);
      console.log('  paymentData:', JSON.stringify(paymentData, null, 2));

      // Verify payer exists
      console.log('🔍 Step 1: Verifying payer exists...');
      console.log('  Looking for payer with ID:', payerId);
      
      let payer;
      try {
        payer = await this.userRepository.findOne({ where: { id: payerId } });
        console.log('✅ Payer found:', payer ? { id: payer.id, name: payer.name, email: payer.email } : 'NULL');
      } catch (error) {
        console.error('❌ Error finding payer:', error.message);
        throw error;
      }
      
      if (!payer) {
        console.error('❌ Payer not found with ID:', payerId);
        throw new NotFoundException(`Payer with ID ${payerId} not found`);
      }

      // Verify payee exists
      console.log('🔍 Step 2: Verifying payee exists...');
      console.log('  Looking for payee with ID:', payee_id);
      
      let payee;
      try {
        payee = await this.userRepository.findOne({ where: { id: payee_id } });
        console.log('✅ Payee found:', payee ? { id: payee.id, name: payee.name, email: payee.email } : 'NULL');
      } catch (error) {
        console.error('❌ Error finding payee:', error.message);
        throw error;
      }
      
      if (!payee) {
        console.error('❌ Payee not found with ID:', payee_id);
        throw new NotFoundException(`Payee with ID ${payee_id} not found`);
      }

      // Verify work contract exists
      console.log('🔍 Step 3: Verifying contract exists...');
      console.log('  Looking for contract with ID:', contract_id);
      
      let contract;
      try {
        contract = await this.contractRepository.findOne({
          where: { id: contract_id },
          relations: ["client", "provider"],
        });
        console.log('✅ Contract found:', contract ? {
          id: contract.id,
          client: contract.client ? { id: contract.client.id, name: contract.client.name } : 'NULL',
          provider: contract.provider ? { id: contract.provider.id, name: contract.provider.name } : 'NULL',
          publication: contract.publication ? { title: contract.publication.title } : 'NULL'
        } : 'NULL');
      } catch (error) {
        console.error('❌ Error finding contract:', error.message);
        throw error;
      }
      
      if (!contract) {
        console.error('❌ Contract not found with ID:', contract_id);
        throw new NotFoundException(`Contract with ID ${contract_id} not found`);
      }

      // Check if this is a cancellation penalty payment
      const isCancellationPenalty = paymentData.reference && paymentData.reference.startsWith('PENALTY-');
      
      if (isCancellationPenalty) {
      } else {
        // Verify payer is the client of the work contract
        console.log('🔍 Step 4: Verifying payer is client...');
        console.log('  Contract client ID:', contract.client?.id);
        console.log('  Payer ID:', payerId);
        console.log('  Match:', contract.client?.id === payerId);
        
        if (contract.client.id !== payerId) {
          console.error('❌ Payer is not the client of this contract');
          console.error('  Expected client ID:', contract.client.id);
          console.error('  Received payer ID:', payerId);
          throw new BadRequestException("Only the client can make payments for this contract");
        }

        // Verify payee is the provider of the work contract
        console.log('🔍 Step 5: Verifying payee is provider...');
        console.log('  Contract provider ID:', contract.provider?.id);
        console.log('  Payee ID:', payee_id);
        console.log('  Match:', contract.provider?.id === payee_id);
        
        if (contract.provider.id !== payee_id) {
          console.error('❌ Payee is not the provider of this contract');
          console.error('  Expected provider ID:', contract.provider.id);
          console.error('  Received payee ID:', payee_id);
          throw new BadRequestException("Payee must be the provider of the work contract");
        }
      }

      console.log('✅ All validations passed, creating payment transaction...');

      // Create payment transaction
      console.log('💾 Step 6: Creating payment transaction in database...');
      let paymentTransaction;
      try {
        paymentTransaction = this.paymentTransactionRepository.create({
          ...paymentData,
          payer,
          payee,
          contract: contract,
          status: PaymentStatus.PENDING,
          reference: paymentData.reference || `PAY-${Date.now()}`,
        });
        
        console.log('✅ Payment transaction created (not saved yet):', {
          amount: paymentTransaction.amount,
          currency: paymentTransaction.currency,
          payment_method: paymentTransaction.payment_method,
          reference: paymentTransaction.reference,
          status: paymentTransaction.status,
        });

        await this.paymentTransactionRepository.save(paymentTransaction);
        console.log('✅ Payment transaction saved to database with ID:', paymentTransaction.id);
        
      } catch (error) {
        console.error('❌ Error creating/saving payment transaction:', error.message);
        console.error('  Error stack:', error.stack);
        throw error;
      }


      // Check if should create Wompi link
      const shouldCreateWompiLink = (
        paymentData.payment_method === PaymentMethod.Wompi ||
        paymentData.payment_method === PaymentMethod.Cash ||
        paymentData.payment_method === PaymentMethod.Bank_transfer ||
        paymentData.payment_method === PaymentMethod.Credit_card
      );
      
      console.log('🔍 Step 7: Checking if should create Wompi link...');
      console.log('  Payment method:', paymentData.payment_method);
      console.log('  Should create Wompi link:', shouldCreateWompiLink);

      if (shouldCreateWompiLink) {
        console.log('🌐 Step 8: Creating Wompi payment link...');
        
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
          'https://suarec-backend-production-de98.up.railway.app';
        
        console.log('🔧 Wompi configuration:');
        console.log('  Backend URL:', backendUrl);
        console.log('  WompiService exists:', !!this.wompiService);
        console.log('  WompiService is configured:', this.wompiService?.isConfigured());
        console.log('  WOMPI_PRIVATE_KEY exists:', !!process.env.WOMPI_PRIVATE_KEY);
        console.log('  WOMPI_PRIVATE_KEY prefix:', process.env.WOMPI_PRIVATE_KEY?.substring(0, 12));
        console.log('  WOMPI_BASE_URL:', process.env.WOMPI_BASE_URL);

        const wompiPayload = {
          name: contract.publication?.title || "Pago de servicio",
          description: paymentData.description || "Pago de servicio",
          amount_in_cents: Math.round(paymentData.amount * 100),
          currency: paymentData.currency,
          redirect_url: `${backendUrl}/suarec/payments/redirect-direct/${paymentTransaction.id}`,
          single_use: true,
          collect_shipping: false,
        };

        console.log('📤 Wompi payload prepared:');
        console.log(JSON.stringify(wompiPayload, null, 2));
        
        console.log('📊 Payload validation:');
        console.log('  name length:', wompiPayload.name?.length);
        console.log('  description length:', wompiPayload.description?.length);
        console.log('  amount_in_cents type:', typeof wompiPayload.amount_in_cents);
        console.log('  amount_in_cents value:', wompiPayload.amount_in_cents);
        console.log('  currency type:', typeof wompiPayload.currency);
        console.log('  redirect_url length:', wompiPayload.redirect_url?.length);

        try {
          console.log('⏳ Calling wompiService.createPaymentLink...');
          const startTime = Date.now();
          
          const paymentLink = await this.wompiService.createPaymentLink(wompiPayload);
          
          const endTime = Date.now();
          console.log(`✅ Wompi payment link created successfully in ${endTime - startTime}ms`);
          console.log('📦 Payment link response:', JSON.stringify(paymentLink, null, 2));

          console.log('💾 Step 9: Updating payment transaction with Wompi data...');
          paymentTransaction.wompi_payment_link = `https://checkout.wompi.co/l/${paymentLink.id}`;
          paymentTransaction.wompi_payment_link_id = paymentLink.id;

          console.log('  Setting wompi_payment_link:', paymentTransaction.wompi_payment_link);
          console.log('  Setting wompi_payment_link_id:', paymentTransaction.wompi_payment_link_id);

          const savedTransaction = await this.paymentTransactionRepository.save(paymentTransaction);
          console.log('✅ Payment transaction updated with Wompi data successfully');
          
        } catch (wompiError) {
          console.error('❌ WOMPI ERROR OCCURRED:');
          console.error('  Error type:', wompiError.constructor.name);
          console.error('  Error message:', wompiError.message);
          console.error('  Error stack:', wompiError.stack);
          
          if (wompiError.response) {
            console.error('  HTTP Status:', wompiError.response.status);
            console.error('  HTTP Status Text:', wompiError.response.statusText);
            console.error('  Response Data:', JSON.stringify(wompiError.response.data, null, 2));
            console.error('  Response Headers:', JSON.stringify(wompiError.response.headers, null, 2));
          }
          
          if (wompiError.request) {
            console.error('  Request Details:', {
              method: wompiError.request.method,
              url: wompiError.request.url,
              timeout: wompiError.request.timeout,
            });
          }
          
          console.error('❌ Re-throwing Wompi error...');
          throw wompiError;
        }
      } else {
        console.log('ℹ️ Skipping Wompi link creation (payment method does not require it)');
      }

      console.log('🔍 Step 10: Retrieving final payment transaction...');
      const finalResult = await this.findOne(paymentTransaction.id);
      
      console.log('✅ Final payment transaction retrieved:', {
        id: finalResult.id,
        status: finalResult.status,
        amount: finalResult.amount,
        currency: finalResult.currency,
        wompi_payment_link: finalResult.wompi_payment_link,
        wompi_payment_link_id: finalResult.wompi_payment_link_id,
      });

      console.log('🚀 ===== FIN createPayment SUCCESS =====');
      return finalResult;
      
    } catch (error) {
      console.error('🚀 ===== FIN createPayment ERROR =====');
      console.error('❌ FINAL ERROR CAUGHT:');
      console.error('  Error type:', error.constructor.name);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      
      if (error.response) {
        console.error('  HTTP Response Error Details:');
        console.error('    Status:', error.response.status);
        console.error('    Status Text:', error.response.statusText);
        console.error('    Data:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('❌ Re-throwing error to controller...');
      throw error; // Re-throw para que el controller lo maneje
    }
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
    if (
      updatePaymentDto.status &&
      this.isProcessedPaymentStatus(updatePaymentDto.status) &&
      !paymentTransaction.paid_at
    ) {
      paymentTransaction.paid_at = new Date();
    }
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
    if (
      this.isProcessedPaymentStatus(updateStatusDto.status) &&
      !paymentTransaction.paid_at
    ) {
      paymentTransaction.paid_at = new Date();
    }

    // Guardar la fecha de actualización automáticamente por el decorator
    await this.paymentTransactionRepository.save(paymentTransaction);

    return this.findOne(id);
  }

  async confirmCashPayment(
    contractId: string,
    actorUserId: number,
    actorRoles: Array<{ name: string }> = [],
  ): Promise<{
    contractId: string;
    paymentTransactionId: string;
    paymentStatus: PaymentStatus;
    feeDebtCreated: boolean;
  }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, deleted_at: null },
      relations: ["client", "provider"],
    });

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    const isAdmin = actorRoles.some((role) => role.name === "ADMIN");
    if (!isAdmin && contract.client.id !== actorUserId) {
      throw new BadRequestException(
        "Solo el cliente o un administrador puede confirmar el pago en efectivo",
      );
    }

    let paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: {
        contract: { id: contractId },
        payment_method: PaymentMethod.Cash,
      },
      relations: ["payer", "payee", "contract"],
      order: { created_at: "DESC" },
    });

    if (!paymentTransaction) {
      paymentTransaction = await this.paymentTransactionRepository.findOne({
        where: { contract: { id: contractId } },
        relations: ["payer", "payee", "contract"],
        order: { created_at: "DESC" },
      });
    }

    if (paymentTransaction) {
      if (paymentTransaction.status !== PaymentStatus.COMPLETED) {
        paymentTransaction.status = PaymentStatus.COMPLETED;
        if (!paymentTransaction.paid_at) {
          paymentTransaction.paid_at = new Date();
        }
        paymentTransaction.payment_method = PaymentMethod.Cash;
        paymentTransaction =
          await this.paymentTransactionRepository.save(paymentTransaction);
      }
    } else {
      const amount = this.getContractAmount(contract);
      paymentTransaction = this.paymentTransactionRepository.create({
        amount,
        currency: "COP",
        payment_method: PaymentMethod.Cash,
        status: PaymentStatus.COMPLETED,
        payer: contract.client,
        payee: contract.provider,
        contract,
        description: "Pago en efectivo confirmado",
        reference: `CASH-${contract.id.substring(0, 8)}`,
        paid_at: new Date(),
      });
      paymentTransaction =
        await this.paymentTransactionRepository.save(paymentTransaction);
    }

    const feeAmount = this.getContractFeeAmount(contract);
    let feeDebtCreated = false;
    if (feeAmount > 0) {
      const existingLedger = await this.platformFeeLedgerRepository.findOne({
        where: {
          contract: { id: contract.id },
          provider: { id: contract.provider.id },
        },
        relations: ["contract", "provider"],
      });

      if (!existingLedger) {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 30);

        const ledgerEntry = this.platformFeeLedgerRepository.create({
          provider: contract.provider,
          contract,
          amount: feeAmount,
          status: PlatformFeeStatus.PENDING,
          due_at: dueAt,
        });

        await this.platformFeeLedgerRepository.save(ledgerEntry);
        feeDebtCreated = true;
      }
    }

    return {
      contractId: contract.id,
      paymentTransactionId: paymentTransaction.id,
      paymentStatus: paymentTransaction.status,
      feeDebtCreated,
    };
  }

  async processWompiWebhook(webhookData: any): Promise<void> {
    console.log("🔔 WEBHOOK WOMPI RECIBIDO - INICIO"); // eslint-disable-line no-console
    console.log("🔔 Timestamp:", new Date().toISOString()); // eslint-disable-line no-console
    console.log("🔔 Webhook data:", JSON.stringify(webhookData, null, 2)); // eslint-disable-line no-console
    
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
    console.log("Timestamp:", new Date().toISOString()); // eslint-disable-line no-console

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

    // Verificar si el estado ya es el mismo para evitar actualizaciones innecesarias
    if (paymentTransaction.status === newStatus) {
      console.log("⚠️ El estado ya es el mismo, no se actualizará:", newStatus); // eslint-disable-line no-console
      return;
    }

    await this.update(paymentTransaction.id, {
      status: newStatus,
      wompi_response: JSON.stringify({
        status: wompiStatus,
        updated_at: new Date(),
      }),
    });

    // Si el pago fue completado, habilitar calificación y procesar penalizaciones
    if (newStatus === PaymentStatus.COMPLETED) {
      // Recargar la transacción con todas las relaciones necesarias
      const fullPaymentTransaction =
        await this.paymentTransactionRepository.findOne({
          where: { id: paymentTransaction.id },
          relations: ["payer", "payee", "contract"],
        });

      if (fullPaymentTransaction) {
        // Verificar si es un pago de penalización por cancelación
        const isPenaltyPayment = fullPaymentTransaction.reference?.startsWith('PENALTY-');
        
        if (isPenaltyPayment && fullPaymentTransaction.contract) {
          console.log("🚫 Pago de penalización completado, cancelando contrato automáticamente..."); // eslint-disable-line no-console
          // Usar el método existente de ContractService para cancelar el contrato
          await this.contractService.cancelContract(
            fullPaymentTransaction.contract.id,
            fullPaymentTransaction.payer.id
          );
        } else {
          console.log("💰 Procesando balance después del pago completado..."); // eslint-disable-line no-console
          console.log("💰 Transacción ID:", fullPaymentTransaction.id); // eslint-disable-line no-console
          console.log("💰 Payer ID:", fullPaymentTransaction.payer?.id); // eslint-disable-line no-console
          console.log("💰 Amount:", fullPaymentTransaction.amount); // eslint-disable-line no-console
          
          // Procesar balance: Cliente recibe saldo positivo al completar el pago
          await this.balanceService.processPaymentCompletedBalance(fullPaymentTransaction);
          
          // Solo habilitar calificación para pagos normales
          await this.enableRatingAfterPayment(fullPaymentTransaction);
        }
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
    const { page, limit, paymentType, status, startDate, endDate } = historyDto;
    const skip = (page - 1) * limit;

    // Construir query base con QueryBuilder para mejor control
    const queryBuilder = this.paymentTransactionRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.payer", "payer")
      .leftJoinAndSelect("payment.payee", "payee")
      .leftJoinAndSelect("payment.contract", "contract")
      .leftJoinAndSelect("contract.publication", "publication");

    // Aplicar filtros por tipo de historial
    if (paymentType === PaymentHistoryType.SENT) {
      // Solo pagos enviados (usuario como payer)
      queryBuilder.where("payer.id = :userId", { userId });
    } else if (paymentType === PaymentHistoryType.RECEIVED) {
      // Solo pagos recibidos (usuario como payee)
      queryBuilder.where("payee.id = :userId", { userId });
    } else {
      // Todos los pagos (enviados y recibidos)
      queryBuilder.where("(payer.id = :userId OR payee.id = :userId)", {
        userId,
      });
    }

    // Filtro por estado - por defecto solo mostrar completadas
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    } else {
      // Si no se especifica estado, mostrar solo las completadas
      queryBuilder.andWhere("payment.status = :status", { status: PaymentStatus.COMPLETED });
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

  private getContractAmount(contract: Contract): number {
    if (contract.currentPrice != null) {
      return Number(contract.currentPrice);
    }
    if (contract.totalPrice != null) {
      return Number(contract.totalPrice);
    }
    if (contract.initialPrice != null) {
      return Number(contract.initialPrice);
    }
    return 0;
  }

  private getContractFeeAmount(contract: Contract): number {
    if (contract.suarecCommission != null) {
      return Number(contract.suarecCommission);
    }

    const baseAmount = this.getContractAmount(contract);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return 0;
    }

    return Number((baseAmount * 0.08).toFixed(2));
  }

  private isProcessedPaymentStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.COMPLETED ||
      status === PaymentStatus.FINISHED
    );
  }
}
