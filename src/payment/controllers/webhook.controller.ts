import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('wompi')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Wompi webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async wompiWebhook(@Body() webhookData: any): Promise<{ success: boolean }> {
    console.log('🚨 WEBHOOK WOMPI RECIBIDO EN WEBHOOK CONTROLLER 🚨');
    console.log('Body recibido:', JSON.stringify(webhookData, null, 2));
    
    try {
      // Verificar firma del webhook
      const isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookData);
      console.log('✅ Firma del webhook válida:', isValid);
      
      if (!isValid) {
        console.log('❌ Firma del webhook inválida');
        throw new UnauthorizedException('Invalid webhook signature');
      }
      
      await this.paymentService.processWompiWebhook(webhookData);
      console.log('✅ Webhook procesado exitosamente');
      return { success: true };
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }
} 