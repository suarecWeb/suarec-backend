import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaymentHistoryDto } from '../dto/payment-history.dto';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { PaymentMethod, PaymentStatus } from '../../enums/paymentMethod.enum';
import { PaginationResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment transaction' })
  @ApiResponse({ status: 201, description: 'Payment transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or contract not found' })
  @ApiBearerAuth()
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req): Promise<PaymentTransaction> {
    return this.paymentService.createPayment(createPaymentDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment transactions' })
  @ApiResponse({ status: 200, description: 'List of payment transactions' })
  @ApiBearerAuth()
  async findAll(): Promise<PaymentTransaction[]> {
    return this.paymentService.findAll();
  }

  @Get('my-payments')
  @ApiOperation({ summary: 'Get payment transactions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user payment transactions' })
  @ApiBearerAuth()
  async findMyPayments(@Request() req): Promise<PaymentTransaction[]> {
    return this.paymentService.findByUser(req.user.id);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get paginated payment history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated payment history with filters' })
  @ApiQuery({ type: PaymentHistoryDto })
  @ApiBearerAuth()
  async getMyPaymentHistory(
    @Request() req,
    @Query() historyDto: PaymentHistoryDto
  ): Promise<PaginationResponse<PaymentTransaction>> {
    return this.paymentService.getPaymentHistory(req.user.id, historyDto);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get payment transactions for a specific contract' })
  @ApiResponse({ status: 200, description: 'List of contract payment transactions' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiBearerAuth()
  async findByContract(@Param('contractId') contractId: string): Promise<PaymentTransaction[]> {
    return this.paymentService.findByContract(contractId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment transaction details' })
  @ApiResponse({ status: 404, description: 'Payment transaction not found' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string): Promise<PaymentTransaction> {
    return this.paymentService.findOne(id);
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update a payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Payment transaction not found' })
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto): Promise<PaymentTransaction> {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment transaction not found' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string): Promise<void> {
    return this.paymentService.remove(id);
  }



  @Post('wompi/verify/:transactionId')
  @ApiOperation({ summary: 'Verify a Wompi transaction status' })
  @ApiResponse({ status: 200, description: 'Transaction status verified' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiBearerAuth()
  async verifyWompiTransaction(@Param('transactionId') transactionId: string): Promise<{ status: string }> {
    // This endpoint can be used to manually verify transaction status
    const paymentTransaction = await this.paymentService.findOne(transactionId);
    return { status: paymentTransaction.status };
  }

  @Get('debug/transactions')
  @Public()
  @ApiOperation({ summary: 'Debug endpoint to see all payment transactions' })
  async debugTransactions(): Promise<any> {
    const transactions = await this.paymentService.findAll();
    return transactions.map(t => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      wompi_payment_link_id: t.wompi_payment_link_id,
      wompi_transaction_id: t.wompi_transaction_id,
      wompi_payment_link: t.wompi_payment_link,
      created_at: t.created_at
    }));
  }

  @Post('test-webhook/:transactionId')
  @Public()
  @ApiOperation({ summary: 'Test webhook with a specific transaction' })
  async testWebhook(@Param('transactionId') transactionId: string): Promise<any> {
    console.log('🧪 PROBANDO WEBHOOK PARA TRANSACCIÓN:', transactionId);
    
    // Buscar la transacción
    const transaction = await this.paymentService.findOne(transactionId);
    console.log('Transacción encontrada:', {
      id: transaction.id,
      wompi_payment_link_id: transaction.wompi_payment_link_id,
      status: transaction.status
    });
    
    // Simular webhook de Wompi
    const mockWebhook = {
      event: 'transaction.paid',
      data: {
        id: transaction.wompi_payment_link_id,
        status: 'APPROVED'
      }
    };
    
    console.log('Webhook simulado:', JSON.stringify(mockWebhook, null, 2));
    
    try {
      await this.paymentService.processWompiWebhook(mockWebhook);
      console.log('✅ Webhook simulado procesado exitosamente');
      
      // Verificar el estado actualizado
      const updatedTransaction = await this.paymentService.findOne(transactionId);
      return {
        success: true,
        original_status: transaction.status,
        new_status: updatedTransaction.status,
        wompi_payment_link_id: transaction.wompi_payment_link_id
      };
    } catch (error) {
      console.error('❌ Error en webhook simulado:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('fix-missing-transaction')
  @Public()
  @ApiOperation({ summary: 'Fix missing transaction for webhook test_2m6w0h' })
  async fixMissingTransaction(): Promise<any> {
    console.log('🔧 Creando transacción faltante para test_2m6w0h');
    
    try {
      // Crear una transacción manual para el pago que ya se procesó
      const createPaymentDto = {
        amount: 59500.00,
        currency: 'COP',
        payment_method: PaymentMethod.Wompi,
        contract_id: 'some-contract-id', // Necesitas un contract_id válido
        payee_id: 1, // Necesitas un payee_id válido
        description: 'Pago de servicio - Transacción faltante'
      };
      
      const transaction = await this.paymentService.createPayment(createPaymentDto, 1);
      
      // Actualizar manualmente con el payment_link_id del webhook
      await this.paymentService.update(transaction.id, {
        wompi_payment_link_id: 'test_2m6w0h',
        wompi_payment_link: 'https://checkout.wompi.co/l/test_2m6w0h',
        status: PaymentStatus.PENDING
      });
      
      console.log('✅ Transacción creada:', transaction.id);
      
      return {
        success: true,
        transaction_id: transaction.id,
        wompi_payment_link_id: 'test_2m6w0h'
      };
    } catch (error) {
      console.error('❌ Error creando transacción:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('update-existing-transaction')
  @Public()
  @ApiOperation({ summary: 'Update existing transaction with missing wompi_payment_link_id' })
  async updateExistingTransaction(): Promise<any> {
    console.log('🔧 Actualizando transacción existente con wompi_payment_link_id faltante');
    
    try {
      // Buscar la transacción que tiene el payment_link pero no el payment_link_id
      const transactions = await this.paymentService.findAll();
      const targetTransaction = transactions.find(t => 
        t.wompi_payment_link === 'https://checkout.wompi.co/l/test_2m6w0h' && 
        !t.wompi_payment_link_id
      );
      
      if (!targetTransaction) {
        return { success: false, error: 'Transacción no encontrada' };
      }
      
      console.log('✅ Transacción encontrada:', targetTransaction.id);
      
      // Actualizar con el payment_link_id
      await this.paymentService.update(targetTransaction.id, {
        wompi_payment_link_id: 'test_2m6w0h'
      });
      
      console.log('✅ Transacción actualizada con wompi_payment_link_id');
      
      return {
        success: true,
        transaction_id: targetTransaction.id,
        wompi_payment_link_id: 'test_2m6w0h'
      };
    } catch (error) {
      console.error('❌ Error actualizando transacción:', error);
      return { success: false, error: error.message };
    }
  }
}