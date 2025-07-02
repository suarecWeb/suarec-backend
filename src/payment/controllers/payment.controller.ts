import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment transaction' })
  @ApiResponse({ status: 201, description: 'Payment transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or work contract not found' })
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

  @Get('work-contract/:workContractId')
  @ApiOperation({ summary: 'Get payment transactions for a specific work contract' })
  @ApiResponse({ status: 200, description: 'List of work contract payment transactions' })
  @ApiResponse({ status: 404, description: 'Work contract not found' })
  @ApiBearerAuth()
  async findByWorkContract(@Param('workContractId') workContractId: string): Promise<PaymentTransaction[]> {
    return this.paymentService.findByWorkContract(workContractId);
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

  @Post('wompi/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Wompi webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async wompiWebhook(@Body() webhookData: any): Promise<{ success: boolean }> {
    const isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookData);
    if (!isValid) throw new UnauthorizedException('Invalid webhook signature');
    await this.paymentService.processWompiWebhook(webhookData);
    return { success: true };
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
} 