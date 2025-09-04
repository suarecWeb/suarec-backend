import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { BalanceTransaction, BalanceTransactionType, BalanceTransactionStatus } from "../entities/balance-transaction.entity";
import { Contract } from "../../contract/entities/contract.entity";
import { PaymentTransaction } from "../../payment/entities/payment-transaction.entity";

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BalanceTransaction)
    private balanceTransactionRepository: Repository<BalanceTransaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * Obtiene el balance actual de un usuario (debit_balance - credit_balance)
   */
  async getUserBalance(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["debit_balance", "credit_balance"],
    });

    if (!user) {
      throw new BadRequestException("Usuario no encontrado");
    }

    // Balance neto = deudas - créditos
    return Number(user.debit_balance) - Number(user.credit_balance);
  }

  /**
   * Obtiene el usuario con sus balances separados
   */
  async getUserWithBalances(userId: number): Promise<{ debit_balance: number; credit_balance: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["debit_balance", "credit_balance"],
    });

    if (!user) {
      throw new BadRequestException("Usuario no encontrado");
    }

    return {
      debit_balance: Number(user.debit_balance) || 0,
      credit_balance: Number(user.credit_balance) || 0,
    };
  }

  /**
   * Verifica si un usuario puede solicitar nuevos servicios (no tiene deudas pendientes)
   */
  async canRequestNewService(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["debit_balance"],
    });

    if (!user) {
      throw new BadRequestException("Usuario no encontrado");
    }

    // Solo puede solicitar servicios si NO tiene deudas pendientes (debit_balance debe ser exactamente 0)
    return Number(user.debit_balance) === 0;
  }

  /**
   * Procesa el balance cuando se verifica un OTP
   * Cliente (recibe servicio): incrementa deuda
   * Proveedor (provee servicio): incrementa crédito
   */
  async processOTPVerificationBalance(contract: Contract): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener usuarios con balances separados
      const client = await queryRunner.manager.findOne(User, {
        where: { id: contract.client.id },
        select: ["id", "debit_balance", "credit_balance"],
      });

      const provider = await queryRunner.manager.findOne(User, {
        where: { id: contract.provider.id },
        select: ["id", "debit_balance", "credit_balance"],
      });

      if (!client || !provider) {
        throw new BadRequestException("Usuario no encontrado");
      }

      // Usar el precio más apropiado: currentPrice > totalPrice > initialPrice
      const contractAmount = Number(contract.currentPrice || contract.totalPrice || contract.initialPrice);
      
      if (!contractAmount || contractAmount <= 0) {
        throw new BadRequestException(`Monto del contrato inválido: ${contractAmount}`);
      }

      // Asegurar que los balances sean números válidos
      const clientCurrentDebit = Number(client.debit_balance) || 0;
      const providerCurrentCredit = Number(provider.credit_balance) || 0;

      // Actualizar balance del cliente (incrementar deuda - recibe servicio)
      const clientNewDebit = clientCurrentDebit + contractAmount;
      await queryRunner.manager.update(User, client.id, {
        debit_balance: clientNewDebit,
      });

      // Actualizar balance del proveedor (incrementar crédito - provee servicio)
      const providerNewCredit = providerCurrentCredit + contractAmount;
      await queryRunner.manager.update(User, provider.id, {
        credit_balance: providerNewCredit,
      });

      // Crear transacciones de balance
      const clientTransaction = this.balanceTransactionRepository.create({
        user: client,
        amount: -contractAmount,
        balanceBefore: clientCurrentDebit,
        balanceAfter: clientNewDebit,
        type: BalanceTransactionType.OTP_VERIFICATION_DEBIT,
        status: BalanceTransactionStatus.COMPLETED,
        description: `Deuda por recibir servicio - Contrato ${contract.id}`,
        reference: `CONTRACT-${contract.id}`,
        contract: contract,
      });

      const providerTransaction = this.balanceTransactionRepository.create({
        user: provider,
        amount: contractAmount,
        balanceBefore: providerCurrentCredit,
        balanceAfter: providerNewCredit,
        type: BalanceTransactionType.OTP_VERIFICATION_CREDIT,
        status: BalanceTransactionStatus.COMPLETED,
        description: `Crédito por proveer servicio - Contrato ${contract.id}`,
        reference: `CONTRACT-${contract.id}`,
        contract: contract,
      });

      await queryRunner.manager.save(BalanceTransaction, clientTransaction);
      await queryRunner.manager.save(BalanceTransaction, providerTransaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Procesa el balance cuando se completa un pago con Wompi
   * Cliente paga su deuda (reduce debit_balance)
   */
  async processPaymentCompletedBalance(paymentTransaction: PaymentTransaction): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener usuario con balance de deuda
      const user = await queryRunner.manager.findOne(User, {
        where: { id: paymentTransaction.payer.id },
        select: ["id", "debit_balance"],
      });

      if (!user) {
        throw new BadRequestException("Usuario no encontrado");
      }

      const paymentAmount = Number(paymentTransaction.amount);
      
      if (!paymentAmount || paymentAmount <= 0) {
        throw new BadRequestException("Monto del pago inválido");
      }

      // Asegurar que el balance de deuda sea un número válido
      const currentDebit = Number(user.debit_balance) || 0;

      // Verificar que el usuario tenga deudas para pagar
      if (currentDebit <= 0) {
        throw new BadRequestException("El usuario no tiene deudas pendientes para pagar");
      }

      // Calcular cuánto se puede pagar (no más que la deuda existente)
      const amountToPay = Math.min(paymentAmount, currentDebit);
      const newDebit = currentDebit - amountToPay;

      // Actualizar balance de deuda del usuario (reducir deuda)
      await queryRunner.manager.update(User, user.id, {
        debit_balance: newDebit,
      });

      // Crear transacción de balance
      const balanceTransaction = this.balanceTransactionRepository.create({
        user: user,
        amount: amountToPay,
        balanceBefore: currentDebit,
        balanceAfter: newDebit,
        type: BalanceTransactionType.PAYMENT_COMPLETED_CREDIT,
        status: BalanceTransactionStatus.COMPLETED,
        description: `Pago de deuda - Transacción ${paymentTransaction.id}`,
        reference: `PAYMENT-${paymentTransaction.id}`,
        contract: paymentTransaction.contract,
        paymentTransaction: paymentTransaction,
      });

      await queryRunner.manager.save(BalanceTransaction, balanceTransaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene el historial de transacciones de balance de un usuario
   */
  async getBalanceHistory(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: BalanceTransaction[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.balanceTransactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.contract", "contract")
      .leftJoinAndSelect("transaction.paymentTransaction", "paymentTransaction")
      .where("transaction.user.id = :userId", { userId })
      .orderBy("transaction.createdAt", "DESC");

    const [transactions, total] = await Promise.all([
      queryBuilder.skip(skip).take(limit).getMany(),
      queryBuilder.getCount(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
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
   * Obtiene estadísticas de balance de un usuario
   */
  async getBalanceStats(userId: number): Promise<{
    currentBalance: number;
    totalDebits: number;
    totalCredits: number;
    pendingDebits: number;
    canRequestNewService: boolean;
  }> {
    const currentBalance = await this.getUserBalance(userId);
    const canRequestNewService = await this.canRequestNewService(userId);

    const stats = await this.balanceTransactionRepository
      .createQueryBuilder("transaction")
      .select([
        "SUM(CASE WHEN transaction.amount < 0 THEN ABS(transaction.amount) ELSE 0 END) as totalDebits",
        "SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END) as totalCredits",
        "SUM(CASE WHEN transaction.amount < 0 AND transaction.status = 'pending' THEN ABS(transaction.amount) ELSE 0 END) as pendingDebits",
      ])
      .where("transaction.user.id = :userId", { userId })
      .getRawOne();

    return {
      currentBalance,
      totalDebits: parseFloat(stats.totalDebits || "0"),
      totalCredits: parseFloat(stats.totalCredits || "0"),
      pendingDebits: parseFloat(stats.pendingDebits || "0"),
      canRequestNewService,
    };
  }
}
