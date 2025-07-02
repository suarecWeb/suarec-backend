import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { WompiService } from './wompi.service';
import { PaymentMethod, PaymentStatus } from '../../enums/paymentMethod.enum';
import { User } from '../../user/entities/user.entity';
import { WorkContract } from '../../work-contract/entities/work-contract.entity';

@Injectable()
export class PaymentService {
  public wompiService: WompiService;
  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WorkContract)
    private workContractRepository: Repository<WorkContract>,
    wompiService: WompiService,
  ) {
    this.wompiService = wompiService;
  }

  async createPayment(createPaymentDto: CreatePaymentDto, payerId: number): Promise<PaymentTransaction> {
    const { work_contract_id, payee_id, ...paymentData } = createPaymentDto;

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
    const workContract = await this.workContractRepository.findOne({ 
      where: { id: work_contract_id },
      relations: ['client', 'provider']
    });
    if (!workContract) {
      throw new NotFoundException(`Work contract with ID ${work_contract_id} not found`);
    }

    // Verify payer is the client of the work contract
    if (workContract.client.id !== payerId) {
      throw new BadRequestException('Only the client can make payments for this contract');
    }

    // Verify payee is the provider of the work contract
    if (workContract.provider.id !== payee_id) {
      throw new BadRequestException('Payee must be the provider of the work contract');
    }

    // Create payment transaction
    const paymentTransaction = this.paymentTransactionRepository.create({
      ...paymentData,
      payer,
      payee,
      work_contract: workContract,
      status: PaymentStatus.PENDING,
      reference: paymentData.reference || `PAY-${Date.now()}`,
    });

    await this.paymentTransactionRepository.save(paymentTransaction);

    // If payment method is Wompi, create Wompi transaction
    if (paymentData.payment_method === PaymentMethod.Wompi) {
      await this.processWompiPayment(paymentTransaction);
    }

    return this.findOne(paymentTransaction.id);
  }

  private async processWompiPayment(paymentTransaction: PaymentTransaction): Promise<void> {
    try {
      if (!this.wompiService.isConfigured()) {
        throw new Error('Wompi is not configured');
      }

      const wompiResponse = await this.wompiService.createTransaction(
        paymentTransaction.amount,
        paymentTransaction.currency,
        paymentTransaction.reference,
        paymentTransaction.payer.email,
        `${process.env.FRONTEND_URL}/payment/success?transaction_id=${paymentTransaction.id}`,
        paymentTransaction.wompi_payment_type,
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
      // Update payment transaction with error
      await this.paymentTransactionRepository.update(paymentTransaction.id, {
        status: PaymentStatus.FAILED,
        error_message: error.message,
      });
      throw error;
    }
  }

  async findAll(): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      relations: ['payer', 'payee', 'work_contract'],
    });
  }

  async findOne(id: string): Promise<PaymentTransaction> {
    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id },
      relations: ['payer', 'payee', 'work_contract'],
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
      relations: ['payer', 'payee', 'work_contract'],
      order: { created_at: 'DESC' },
    });
  }

  async findByWorkContract(workContractId: string): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: { work_contract: { id: workContractId } },
      relations: ['payer', 'payee', 'work_contract'],
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

      // Find payment transaction by Wompi transaction ID
      const paymentTransaction = await this.paymentTransactionRepository.findOne({
        where: { wompi_transaction_id: data.id },
        relations: ['work_contract'],
      });

      if (!paymentTransaction) {
        throw new Error(`Payment transaction not found for Wompi transaction ID: ${data.id}`);
      }

      // Update payment status based on webhook event
      switch (event) {
        case 'transaction.updated':
          await this.updatePaymentStatus(paymentTransaction, data.status);
          break;
        case 'transaction.paid':
          await this.updatePaymentStatus(paymentTransaction, 'COMPLETED');
          break;
        case 'transaction.declined':
          await this.updatePaymentStatus(paymentTransaction, 'FAILED');
          break;
        default:
          console.log(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      console.error('Error processing Wompi webhook:', error);
      throw error;
    }
  }

  private async updatePaymentStatus(paymentTransaction: PaymentTransaction, wompiStatus: string): Promise<void> {
    let newStatus: PaymentStatus;

    switch (wompiStatus) {
      case 'APPROVED':
        newStatus = PaymentStatus.COMPLETED;
        break;
      case 'DECLINED':
        newStatus = PaymentStatus.FAILED;
        break;
      case 'PENDING':
        newStatus = PaymentStatus.PROCESSING;
        break;
      default:
        newStatus = PaymentStatus.PENDING;
    }

    await this.update(paymentTransaction.id, { status: newStatus });
  }

  async remove(id: string): Promise<void> {
    const paymentTransaction = await this.findOne(id);
    await this.paymentTransactionRepository.remove(paymentTransaction);
  }
} 