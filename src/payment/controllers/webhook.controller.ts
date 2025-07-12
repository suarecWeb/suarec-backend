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
  async wompiWebhook(@Body() webhookData: any): Promise<{ success: boolean; error?: string }> {
    console.log('🚨 WEBHOOK WOMPI RECIBIDO EN WEBHOOK CONTROLLER 🚨');
    console.log('Body recibido:', JSON.stringify(webhookData, null, 2));
    
    try {
      // En modo desarrollo, permitir webhooks sin verificación de firma
      const isDevelopment = process.env.NODE_ENV === 'development';
      let isValid = true;
      
      if (!isDevelopment) {
        // Verificar firma del webhook solo en producción
        isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookData);
        console.log('✅ Firma del webhook válida:', isValid);
        
        if (!isValid) {
          console.log('❌ Firma del webhook inválida');
          throw new UnauthorizedException('Invalid webhook signature');
        }
      } else {
        console.log('🔧 Modo desarrollo: Omitiendo verificación de firma');
      }
      
      await this.paymentService.processWompiWebhook(webhookData);
      console.log('✅ Webhook procesado exitosamente');
      return { success: true };
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      
      // En desarrollo, devolver el error detallado
      if (process.env.NODE_ENV === 'development') {
        console.error('Stack trace:', error.stack);
      }
      
      // No re-lanzar el error para evitar que Wompi reintente
      return { success: false, error: error.message };
    }
  }

  @Post('wompi-test')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Wompi webhook endpoint without signature verification' })
  @ApiResponse({ status: 200, description: 'Test webhook processed successfully' })
  async wompiTestWebhook(@Body() webhookData: any): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 TEST WEBHOOK WOMPI RECIBIDO 🧪');
    console.log('Body recibido:', JSON.stringify(webhookData, null, 2));
    
    try {
      // Procesar webhook sin verificación de firma
      await this.paymentService.processWompiWebhook(webhookData);
      console.log('✅ Test webhook procesado exitosamente');
      return { success: true };
    } catch (error) {
      console.error('❌ Error procesando test webhook:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('debug-webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debug webhook data structure' })
  async debugWebhook(@Body() webhookData: any): Promise<any> {
    console.log('🔍 DEBUG WEBHOOK DATA STRUCTURE 🔍');
    console.log('Full webhook data:', JSON.stringify(webhookData, null, 2));
    
    const analysis = {
      hasSignature: !!webhookData.signature,
      hasTimestamp: !!webhookData.timestamp,
      hasData: !!webhookData.data,
      hasEvent: !!webhookData.event,
      dataKeys: webhookData.data ? Object.keys(webhookData.data) : [],
      signatureStructure: webhookData.signature ? Object.keys(webhookData.signature) : [],
      eventType: webhookData.event,
      dataStructure: webhookData.data ? {
        hasTransaction: !!webhookData.data.transaction,
        hasId: !!webhookData.data.id,
        hasStatus: !!webhookData.data.status,
        hasPaymentLinkId: !!webhookData.data.payment_link_id,
        transactionKeys: webhookData.data.transaction ? Object.keys(webhookData.data.transaction) : []
      } : null
    };
    
    console.log('📊 Webhook analysis:', JSON.stringify(analysis, null, 2));
    
    return {
      success: true,
      webhookData,
      analysis
    };
  }
}