import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { WompiService } from './wompi.service';
import { PaymentMethod, PaymentStatus } from '../../enums/paymentMethod.enum';
import { User } from '../../user/entities/user.entity';
import { Contract } from '../../contract/entities/contract.entity';

@Injectable()
export class PaymentService {
  public wompiService: WompiService;
  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    wompiService: WompiService,
  ) {
    this.wompiService = wompiService;
  }

  async createPayment(createPaymentDto: CreatePaymentDto, payerId: number): Promise<PaymentTransaction> {
    const { contract_id, payee_id, acceptance_token, accept_personal_auth, ...paymentData } = createPaymentDto;

    // Verify payer exists
    const payer = await this.userRepository.findOne({ where: { id: payerId } });
    if (!payer) {
      throw new NotFoundException(`Payer with ID ${payerId} not found`);
    }

    // Verify payee exists
    const payee = await this.userRepository.findOne({ where: { id: payee_id } });
    if (!payee) {
      throw new NotFoundException(`Payee with ID ${payee_id} not found`);
    }

    // Verify work contract exists
    const contract = await this.contractRepository.findOne({ 
      where: { id: contract_id },
      relations: ['client', 'provider']
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contract_id} not found`);
    }

    // Verify payer is the client of the work contract
    if (contract.client.id !== payerId) {
      throw new BadRequestException('Only the client can make payments for this contract');
    }

    // Verify payee is the provider of the work contract
    if (contract.provider.id !== payee_id) {
      throw new BadRequestException('Payee must be the provider of the work contract');
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

    // If payment method is Wompi, create Wompi transaction
    if (paymentData.payment_method === PaymentMethod.Wompi) {
      console.log('=== CREANDO PAYMENT LINK ===');
      const paymentLink = await this.wompiService.createPaymentLink({
        name: contract.publication?.title || 'Pago de servicio',
        description: paymentData.description || 'Pago de servicio',
        amount: paymentData.amount,
        currency: paymentData.currency,
        redirect_url: `${process.env.FRONTEND_URL}/payments/success`,
        single_use: true,
        collect_shipping: false,
      });
      console.log('✅ Payment Link creado:', JSON.stringify(paymentLink, null, 2));
      
      paymentTransaction.wompi_payment_link = `https://checkout.wompi.co/l/${paymentLink.id}`;
      paymentTransaction.wompi_payment_link_id = paymentLink.id;
      
      console.log('💾 Guardando en BD:');
      console.log('  - wompi_payment_link:', paymentTransaction.wompi_payment_link);
      console.log('  - wompi_payment_link_id:', paymentTransaction.wompi_payment_link_id);
      
      const savedTransaction = await this.paymentTransactionRepository.save(paymentTransaction);
      console.log('✅ Transacción guardada con ID:', savedTransaction.id);
      console.log('✅ wompi_payment_link_id guardado:', savedTransaction.wompi_payment_link_id);
    }

    return this.findOne(paymentTransaction.id);
  }

  private async processWompiPayment(paymentTransaction: PaymentTransaction, acceptance_token?: string, accept_personal_auth?: string): Promise<void> {
    try {
      if (!this.wompiService.isConfigured()) {
        throw new Error('Wompi is not configured');
      }
  
      // Use the payer's email from the payment transaction
      const customerEmail = paymentTransaction.payer.email;
      
      if (!customerEmail) {
        throw new Error('Customer email is required for payment processing');
      }
  
      if (!acceptance_token) {
        throw new Error('Acceptance token is required');
      }
  
      if (!accept_personal_auth) {
        throw new Error('Personal data authorization token is required');
      }
  
      const wompiResponse = await this.wompiService.createTransaction(
        paymentTransaction.amount,
        paymentTransaction.currency,
        paymentTransaction.reference,
        customerEmail, // This will be cleaned in WompiService
        `${process.env.FRONTEND_URL}/payment/success?transaction_id=${paymentTransaction.id}`,
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
      console.error('Error in processWompiPayment:', error);
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
      relations: ['payer', 'payee', 'contract'],
    });
  }

  async findOne(id: string): Promise<PaymentTransaction> {
    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id },
      relations: ['payer', 'payee', 'contract'],
    });

    if (!paymentTransaction) {
      throw new NotFoundException(`Payment transaction with ID ${id} not found`);
    }

    return paymentTransaction;
  }

  async findByUser(userId: number): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: [
        { payer: { id: userId } },
        { payee: { id: userId } },
      ],
      relations: ['payer', 'payee', 'contract'],
      order: { created_at: 'DESC' },
    });
  }

  async findByContract(contractId: string): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: { contract: { id: contractId } },
      relations: ['payer', 'payee', 'contract'],
      order: { created_at: 'DESC' },
    });
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentTransaction> {
    const paymentTransaction = await this.findOne(id);

    Object.assign(paymentTransaction, updatePaymentDto);
    await this.paymentTransactionRepository.save(paymentTransaction);

    return paymentTransaction;
  }

  async processWompiWebhook(webhookData: any): Promise<void> {
    try {
      const { event, data } = webhookData;
      console.log('=== WEBHOOK WOMPI RECIBIDO ===');
      console.log('Event:', event);
      console.log('Data structure:', Object.keys(data));

      // Extraer el payment_link_id del webhook
      let paymentLinkId = null;
      let transactionStatus = null;

      if (data.transaction) {
        // Estructura del webhook real de Wompi
        paymentLinkId = data.transaction.payment_link_id;
        transactionStatus = data.transaction.status;
        console.log('📋 Webhook structure: transaction nested');
        console.log('Payment Link ID:', paymentLinkId, 'Status:', transactionStatus);
      } else if (data.payment_link_id) {
        // Estructura directa
        paymentLinkId = data.payment_link_id;
        transactionStatus = data.status;
        console.log('📋 Webhook structure: direct');
        console.log('Payment Link ID:', paymentLinkId, 'Status:', transactionStatus);
      } else {
        // Estructura alternativa usando ID
        paymentLinkId = data.id;
        transactionStatus = data.status;
        console.log('📋 Webhook structure: using ID field');
        console.log('Data ID:', paymentLinkId, 'Status:', transactionStatus);
      }

      if (!paymentLinkId) {
        console.error('❌ No se pudo extraer payment_link_id del webhook');
        console.log('📋 Estructura completa del data:', JSON.stringify(data, null, 2));
        throw new Error('Payment link ID not found in webhook data');
      }

      // Buscar por Payment Link ID
      console.log('🔍 Buscando transacción por wompi_payment_link_id:', paymentLinkId);
      const paymentTransaction = await this.paymentTransactionRepository.findOne({
        where: { wompi_payment_link_id: paymentLinkId },
        relations: ['contract'],
      });

      if (!paymentTransaction) {
        console.log('❌ Transacción NO encontrada por wompi_payment_link_id');
        
        // Buscar por transaction ID como alternativa
        console.log('🔍 Buscando transacción por wompi_transaction_id:', paymentLinkId);
        const altTransaction = await this.paymentTransactionRepository.findOne({
          where: { wompi_transaction_id: paymentLinkId },
          relations: ['contract'],
        });
        
        if (!altTransaction) {
          console.log('❌ Transacción NO encontrada por wompi_transaction_id tampoco');
          
          // Buscar TODAS las transacciones para debug
          console.log('🔍 Buscando TODAS las transacciones para debug...');
          const allTransactions = await this.paymentTransactionRepository.find({
            select: ['id', 'wompi_payment_link_id', 'wompi_transaction_id', 'status', 'amount']
          });
          console.log('📋 Todas las transacciones:', allTransactions);
          
          throw new Error(`Payment transaction not found for Wompi ID: ${paymentLinkId}`);
        }
        
        console.log('✅ Transacción encontrada por wompi_transaction_id');
        return await this.updatePaymentStatus(altTransaction, transactionStatus);
      }

      console.log('✅ Transacción encontrada por wompi_payment_link_id:', paymentTransaction.id);
      console.log('🎯 Evento del webhook:', event);
      console.log('📊 Estado de Wompi:', transactionStatus);

      // Update payment status based on webhook event
      switch (event) {
        case 'transaction.updated':
          await this.updatePaymentStatus(paymentTransaction, transactionStatus);
          break;
        case 'transaction.paid':
          await this.updatePaymentStatus(paymentTransaction, 'APPROVED');
          break;
        case 'transaction.declined':
          await this.updatePaymentStatus(paymentTransaction, 'DECLINED');
          break;
        case 'transaction.pending':
          await this.updatePaymentStatus(paymentTransaction, 'PENDING');
          break;
        default:
          console.log(`⚠️ Evento de webhook no manejado: ${event}`);
          // Aún así, actualizar con el estado recibido
          if (transactionStatus) {
            await this.updatePaymentStatus(paymentTransaction, transactionStatus);
          }
      }
    } catch (error) {
      console.error('❌ Error processing Wompi webhook:', error);
      throw error;
    }
  }

  private async updatePaymentStatus(paymentTransaction: PaymentTransaction, wompiStatus: string): Promise<void> {
    console.log('=== ACTUALIZANDO ESTADO DE PAGO ===');
    console.log('Transacción ID:', paymentTransaction.id);
    console.log('Estado actual:', paymentTransaction.status);
    console.log('Estado de Wompi:', wompiStatus);
    
    let newStatus: PaymentStatus;

    switch (wompiStatus) {
      case 'APPROVED':
      case 'COMPLETED':
        newStatus = PaymentStatus.COMPLETED;
        break;
      case 'DECLINED':
      case 'FAILED':
        newStatus = PaymentStatus.FAILED;
        break;
      case 'PENDING':
        newStatus = PaymentStatus.PROCESSING;
        break;
      default:
        newStatus = PaymentStatus.PENDING;
    }

    console.log(`🔄 Cambiando estado de ${paymentTransaction.status} a ${newStatus}`);
    
    try {
      await this.update(paymentTransaction.id, { 
        status: newStatus,
        wompi_response: JSON.stringify({ status: wompiStatus, updated_at: new Date() })
      });
      console.log('✅ Estado actualizado correctamente en BD');
      
      // Verificar que se actualizó
      const updatedTransaction = await this.paymentTransactionRepository.findOne({
        where: { id: paymentTransaction.id }
      });
      console.log('✅ Verificación - Estado actual en BD:', updatedTransaction.status);
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const paymentTransaction = await this.findOne(id);
    await this.paymentTransactionRepository.remove(paymentTransaction);
  }
} 