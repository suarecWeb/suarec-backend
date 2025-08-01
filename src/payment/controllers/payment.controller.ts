import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Response,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PaymentService } from "../services/payment.service";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { UpdatePaymentDto } from "../dto/update-payment.dto";
import { PaymentHistoryDto } from "../dto/payment-history.dto";
import { AdminPaymentFilterDto } from "../dto/admin-payment-filter.dto";
import { PaymentTransaction } from "../entities/payment-transaction.entity";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { PaymentMethod, PaymentStatus } from "../../enums/paymentMethod.enum";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";

@ApiTags("payments")
@Controller("payments")
@UseGuards(AuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {} // eslint-disable-line no-unused-vars

  @Post()
  @ApiOperation({ summary: "Create a new payment transaction" })
  @ApiResponse({
    status: 201,
    description: "Payment transaction created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "User or contract not found" })
  @ApiBearerAuth()
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req,
  ): Promise<PaymentTransaction> {
    
    console.log('🎯 ===== PAYMENT CONTROLLER CREATE START =====');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌐 Request IP:', req.ip);
    console.log('📱 User Agent:', req.get('User-Agent'));
    console.log('🔑 Request ID:', req.headers['x-request-id'] || 'N/A');
    
    try {
      console.log('👤 Authentication info:');
      console.log('  User exists:', !!req.user);
      console.log('  User ID:', req.user?.id);
      console.log('  User ID type:', typeof req.user?.id);
      console.log('  User name:', req.user?.name);
      console.log('  User email:', req.user?.email);
      
      console.log('📦 Request body received:');
      console.log('  Body keys:', Object.keys(createPaymentDto || {}));
      console.log('  Full body:', JSON.stringify(createPaymentDto, null, 2));
      
      console.log('🔍 Body validation:');
      console.log('  amount:', createPaymentDto.amount, 'type:', typeof createPaymentDto.amount);
      console.log('  currency:', createPaymentDto.currency, 'type:', typeof createPaymentDto.currency);
      console.log('  payment_method:', createPaymentDto.payment_method, 'type:', typeof createPaymentDto.payment_method);
      console.log('  contract_id:', createPaymentDto.contract_id, 'type:', typeof createPaymentDto.contract_id);
      console.log('  payee_id:', createPaymentDto.payee_id, 'type:', typeof createPaymentDto.payee_id);
      console.log('  description length:', createPaymentDto.description?.length);
      console.log('  acceptance_token exists:', !!createPaymentDto.acceptance_token);
      console.log('  accept_personal_auth exists:', !!createPaymentDto.accept_personal_auth);
      
      console.log('⏳ Calling PaymentService.createPayment...');
      const startTime = Date.now();
      
      const result = await this.paymentService.createPayment(createPaymentDto, req.user.id);
      
      const endTime = Date.now();
      console.log(`✅ PaymentService.createPayment completed in ${endTime - startTime}ms`);
      
      console.log('📦 Service result:');
      console.log('  Result ID:', result.id);
      console.log('  Result status:', result.status);
      console.log('  Result amount:', result.amount);
      console.log('  Result currency:', result.currency);
      console.log('  Result payment_method:', result.payment_method);
      console.log('  Result wompi_payment_link exists:', !!result.wompi_payment_link);
      console.log('  Result wompi_payment_link_id:', result.wompi_payment_link_id);
      
      console.log('🎯 ===== PAYMENT CONTROLLER CREATE SUCCESS =====');
      return result;
      
    } catch (error) {
      console.error('🎯 ===== PAYMENT CONTROLLER CREATE ERROR =====');
      console.error('❌ Error caught in controller:');
      console.error('  Error type:', error.constructor.name);
      console.error('  Error message:', error.message);
      console.error('  Error status:', error.status || 'N/A');
      
      if (error.response) {
        console.error('  HTTP Error Details:');
        console.error('    Status:', error.response.status);
        console.error('    Data:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('  Full Error Stack:');
      console.error(error.stack);
      
      console.error('❌ Re-throwing error to NestJS exception handler...');
      throw error; // NestJS manejará la respuesta HTTP
    }
  }

  @Get()
  @Roles("ADMIN")
  @ApiOperation({
    summary:
      "Get all payment transactions (Admin only) with pagination and filters",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of all payment transactions",
  })
  @ApiQuery({ type: AdminPaymentFilterDto })
  @ApiBearerAuth()
  async findAll(
    @Query() filterDto: AdminPaymentFilterDto,
  ): Promise<PaginationResponse<PaymentTransaction>> {
    return this.paymentService.getAllPaymentsForAdmin(filterDto);
  }

  @Get("my-payments")
  @ApiOperation({
    summary: "Get payment transactions for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "List of user payment transactions",
  })
  @ApiBearerAuth()
  async findMyPayments(@Request() req): Promise<PaymentTransaction[]> {
    return this.paymentService.findByUser(req.user.id);
  }

  @Get("my-history")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({
    summary: "Get paginated payment history for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated payment history with filters",
  })
  @ApiQuery({ type: PaymentHistoryDto })
  @ApiBearerAuth()
  async getMyPaymentHistory(
    @Request() req,
    @Query() historyDto: PaymentHistoryDto,
  ): Promise<PaginationResponse<PaymentTransaction>> {
    return this.paymentService.getPaymentHistory(req.user.id, historyDto);
  }

  @Get("contract/:contractId")
  @ApiOperation({ summary: "Get payment transactions for a specific contract" })
  @ApiResponse({
    status: 200,
    description: "List of contract payment transactions",
  })
  @ApiResponse({ status: 404, description: "Contract not found" })
  @ApiBearerAuth()
  async findByContract(
    @Param("contractId") contractId: string,
  ): Promise<PaymentTransaction[]> {
    return this.paymentService.findByContract(contractId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific payment transaction" })
  @ApiResponse({ status: 200, description: "Payment transaction details" })
  @ApiResponse({ status: 404, description: "Payment transaction not found" })
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<PaymentTransaction> {
    return this.paymentService.findOne(id);
  }

  @Post(":id/update")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update a payment transaction (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Payment transaction updated successfully",
  })
  @ApiResponse({ status: 404, description: "Payment transaction not found" })
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentTransaction> {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a payment transaction" })
  @ApiResponse({
    status: 200,
    description: "Payment transaction deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Payment transaction not found" })
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.paymentService.remove(id);
  }

  @Post("wompi/verify/:transactionId")
  @ApiOperation({ summary: "Verify a Wompi transaction status" })
  @ApiResponse({ status: 200, description: "Transaction status verified" })
  @ApiResponse({ status: 404, description: "Transaction not found" })
  @ApiBearerAuth()
  async verifyWompiTransaction(
    @Param("transactionId") transactionId: string,
  ): Promise<{ status: string }> {
    // This endpoint can be used to manually verify transaction status
    const paymentTransaction = await this.paymentService.findOne(transactionId);
    return { status: paymentTransaction.status };
  }

  @Get("debug/transactions")
  @Public()
  @ApiOperation({ summary: "Debug endpoint to see all payment transactions" })
  async debugTransactions(): Promise<any> {
    const transactions = await this.paymentService.findAll();
    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      wompi_payment_link_id: t.wompi_payment_link_id,
      wompi_transaction_id: t.wompi_transaction_id,
      wompi_payment_link: t.wompi_payment_link,
      created_at: t.created_at,
    }));
  }

  @Post("test-webhook/:transactionId")
  @Public()
  @ApiOperation({ summary: "Test webhook with a specific transaction" })
  async testWebhook(
    @Param("transactionId") transactionId: string,
  ): Promise<any> {
    console.log("🧪 PROBANDO WEBHOOK PARA TRANSACCIÓN:", transactionId); // eslint-disable-line no-console

    // Buscar la transacción
    const transaction = await this.paymentService.findOne(transactionId);

    // Simular webhook de Wompi
    const mockWebhook = {
      event: "transaction.paid",
      data: {
        id: transaction.wompi_payment_link_id,
        status: "APPROVED",
      },
    };

    console.log("Webhook simulado:", JSON.stringify(mockWebhook, null, 2)); // eslint-disable-line no-console

    try {
      await this.paymentService.processWompiWebhook(mockWebhook);
      console.log("✅ Webhook simulado procesado exitosamente"); // eslint-disable-line no-console

      // Verificar el estado actualizado
      const updatedTransaction =
        await this.paymentService.findOne(transactionId);
      return {
        success: true,
        original_status: transaction.status,
        new_status: updatedTransaction.status,
        wompi_payment_link_id: transaction.wompi_payment_link_id,
      };
    } catch (error) {
      console.error("❌ Error en webhook simulado:", error); // eslint-disable-line no-console
      return { success: false, error: error.message };
    }
  }

  @Post("fix-missing-transaction")
  @Public()
  @ApiOperation({ summary: "Fix missing transaction for webhook test_2m6w0h" })
  async fixMissingTransaction(): Promise<any> {
    console.log("🔧 Creando transacción faltante para test_2m6w0h"); // eslint-disable-line no-console

    try {
      // Crear una transacción manual para el pago que ya se procesó
      const createPaymentDto = {
        amount: 59500.0,
        currency: "COP",
        payment_method: PaymentMethod.Wompi,
        contract_id: "some-contract-id", // Necesitas un contract_id válido
        payee_id: 1, // Necesitas un payee_id válido
        description: "Pago de servicio - Transacción faltante",
      };

      const transaction = await this.paymentService.createPayment(
        createPaymentDto,
        1,
      );

      // Actualizar manualmente con el payment_link_id del webhook
      await this.paymentService.update(transaction.id, {
        wompi_payment_link_id: "test_2m6w0h",
        wompi_payment_link: "https://checkout.wompi.co/l/test_2m6w0h",
        status: PaymentStatus.PENDING,
      });

      console.log("✅ Transacción creada:", transaction.id); // eslint-disable-line no-console

      return {
        success: true,
        transaction_id: transaction.id,
        wompi_payment_link_id: "test_2m6w0h",
      };
    } catch (error) {
      console.error("❌ Error creando transacción:", error); // eslint-disable-line no-console
      return { success: false, error: error.message };
    }
  }

  @Post("update-existing-transaction")
  @Public()
  @ApiOperation({
    summary: "Update existing transaction with missing wompi_payment_link_id",
  })
  async updateExistingTransaction(): Promise<any> {
    try {
      // Buscar la transacción que tiene el payment_link pero no el payment_link_id
      const transactions = await this.paymentService.findAll();
      const targetTransaction = transactions.find(
        (t) =>
          t.wompi_payment_link === "https://checkout.wompi.co/l/test_2m6w0h" &&
          !t.wompi_payment_link_id,
      );

      if (!targetTransaction) {
        return { success: false, error: "Transacción no encontrada" };
      }

      console.log("✅ Transacción encontrada:", targetTransaction.id); // eslint-disable-line no-console

      // Actualizar con el payment_link_id
      await this.paymentService.update(targetTransaction.id, {
        wompi_payment_link_id: "test_2m6w0h",
      });

      console.log("✅ Transacción actualizada con wompi_payment_link_id"); // eslint-disable-line no-console

      return {
        success: true,
        transaction_id: targetTransaction.id,
        wompi_payment_link_id: "test_2m6w0h",
      };
    } catch (error) {
      console.error("❌ Error actualizando transacción:", error); // eslint-disable-line no-console
      return { success: false, error: error.message };
    }
  }

  @Get("redirect/:transactionId")
  @Public()
  @ApiOperation({ summary: "Handle payment redirect from Wompi" })
  @ApiResponse({
    status: 302,
    description: "Redirect to appropriate frontend page",
  })
  async handlePaymentRedirect(
    @Param("transactionId") transactionId: string,
  ): Promise<{ url: string }> {
    try {
      // Buscar la transacción para obtener el estado actual
      const transaction = await this.paymentService.findOne(transactionId);

      // Determinar URL de redirección basada en el estado
      const redirectUrl = await this.paymentService.handlePaymentRedirect(
        transactionId,
        transaction.status,
      );

      // Retornar URL para redirección manual o usar @Redirect
      return { url: redirectUrl };
    } catch (error) {
      // Si no se encuentra la transacción, redirigir a página de error
      const fallbackUrl = `${process.env.FRONTEND_URL}/payments/failed?transaction_id=${transactionId}&error=not_found`;
      return { url: fallbackUrl };
    }
  }

  @Get("redirect-direct/:transactionId")
  @Public()
  @ApiOperation({ summary: "Direct HTTP redirect from Wompi" })
  @ApiResponse({ status: 302, description: "HTTP redirect to frontend" })
  async handleDirectRedirect(
    @Param("transactionId") transactionId: string,
    @Query("status") status: string,
    @Request() req,
    @Response() res,
  ) {
    try {
      // Buscar la transacción para obtener el estado actual
      const transaction = await this.paymentService.findOne(transactionId);

      // Determinar URL de redirección basada en el estado
      const redirectUrl = await this.paymentService.handlePaymentRedirect(
        transactionId,
        transaction.status,
      );

      // Hacer redirección HTTP real
      return res.redirect(302, redirectUrl);
    } catch (error) {
      // Si no se encuentra la transacción, redirigir a página de error
      const fallbackUrl = `${process.env.FRONTEND_URL}/payments/failed?transaction_id=${transactionId}&error=not_found`;
      return res.redirect(302, fallbackUrl);
    }
  }

  @Get("contract/:contractId/status")
  @ApiOperation({
    summary: "Get payment status for a contract",
    description:
      "Get simple payment status information for a contract to determine if payment button should be shown",
  })
  @ApiResponse({
    status: 200,
    description: "Payment status information",
    schema: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "Contract ID" },
        hasPendingPayments: {
          type: "boolean",
          description: "Has payments in pending or processing status",
        },
        hasCompletedPayments: {
          type: "boolean",
          description: "Has completed or finished payments",
        },
        hasActivePayments: {
          type: "boolean",
          description:
            "Has any active payments (pending, processing, completed, or finished)",
        },
        latestStatus: {
          type: "string",
          enum: Object.values(PaymentStatus),
          description: "Status of the most recent payment",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Contract not found" })
  @ApiBearerAuth()
  async getPaymentStatusByContract(@Param("contractId") contractId: string) {
    return this.paymentService.getPaymentStatusByContract(contractId);
  }
}
