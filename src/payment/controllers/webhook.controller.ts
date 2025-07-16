import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { Public } from '../../auth/decorators/public.decorator';
import * as crypto from 'crypto';

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
    const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚨 WEBHOOK WOMPI RECIBIDO [${requestId}] 🚨`);
    console.log('Body recibido:', JSON.stringify(webhookData, null, 2));
    
    // Validar estructura básica del webhook
    if (!webhookData || !webhookData.event || !webhookData.data) {
      console.error(`❌ [${requestId}] Webhook structure invalid - missing event or data`);
      return { success: false, error: 'Invalid webhook structure' };
    }
    
    try {
      // Determinar si estamos en producción
      const isProduction = process.env.NODE_ENV === 'production';
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      console.log(`🔧 [${requestId}] Environment: ${process.env.NODE_ENV || 'unknown'}`);
      console.log(`🔧 [${requestId}] Production mode: ${isProduction}`);
      
      // Verificar firma del webhook
      let isValid = true;
      
      if (isProduction) {
        console.log(`🔒 [${requestId}] Verificando firma del webhook en producción...`);
        
        // Verificar que el secret esté configurado
        if (!process.env.WOMPI_EVENTS_SECRET) {
          console.error(`❌ [${requestId}] WOMPI_EVENTS_SECRET no está configurado en producción`);
          return { success: false, error: 'Webhook secret not configured' };
        }
        
        isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookData);
        console.log(`${isValid ? '✅' : '❌'} [${requestId}] Firma del webhook válida: ${isValid}`);
        
        if (!isValid) {
          console.error(`❌ [${requestId}] Firma del webhook inválida - rechazando webhook`);
          return { success: false, error: 'Invalid webhook signature' };
        }
      } else if (isDevelopment) {
        console.log(`🔧 [${requestId}] Modo desarrollo: Omitiendo verificación de firma`);
      } else {
        // En cualquier otro ambiente que no sea development, verificar firma
        console.log(`🔒 [${requestId}] Ambiente desconocido, verificando firma por seguridad...`);
        
        if (!process.env.WOMPI_EVENTS_SECRET) {
          console.error(`❌ [${requestId}] WOMPI_EVENTS_SECRET no está configurado`);
          return { success: false, error: 'Webhook secret not configured' };
        }
        
        isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookData);
        console.log(`${isValid ? '✅' : '❌'} [${requestId}] Firma del webhook válida: ${isValid}`);
        
        if (!isValid) {
          console.error(`❌ [${requestId}] Firma del webhook inválida - rechazando webhook`);
          return { success: false, error: 'Invalid webhook signature' };
        }
      }
      
      // Procesar webhook
      console.log(`🔄 [${requestId}] Procesando webhook...`);
      await this.paymentService.processWompiWebhook(webhookData);
      console.log(`✅ [${requestId}] Webhook procesado exitosamente`);
      
      return { success: true };
    } catch (error) {
      console.error(`❌ [${requestId}] Error procesando webhook:`, error);
      
      // En desarrollo, devolver el error detallado
      if (process.env.NODE_ENV === 'development') {
        console.error(`📋 [${requestId}] Stack trace:`, error.stack);
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

  @Post('verify-webhook-config')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify webhook configuration for production' })
  @ApiResponse({ status: 200, description: 'Webhook configuration verified' })
  async verifyWebhookConfig(): Promise<any> {
    console.log('🔍 VERIFICANDO CONFIGURACIÓN DEL WEBHOOK 🔍');
    
    const config = {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      hasWompiEventsSecret: !!process.env.WOMPI_EVENTS_SECRET,
      hasWompiPublicKey: !!process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
      hasWompiPrivateKey: !!process.env.WOMPI_PRIVATE_KEY,
      backendUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      frontendUrl: process.env.FRONTEND_URL,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Configuración del webhook:', JSON.stringify(config, null, 2));
    
    // Validaciones específicas para producción
    const validationResults = [];
    
    if (config.isProduction) {
      if (!config.hasWompiEventsSecret) {
        validationResults.push({
          type: 'ERROR',
          message: 'WOMPI_EVENTS_SECRET no está configurado en producción'
        });
      }
      
      if (!config.hasWompiPrivateKey) {
        validationResults.push({
          type: 'ERROR',
          message: 'WOMPI_PRIVATE_KEY no está configurado en producción'
        });
      }
      
      if (!config.backendUrl) {
        validationResults.push({
          type: 'WARNING',
          message: 'BACKEND_URL no está configurado'
        });
      }
      
      if (!config.frontendUrl) {
        validationResults.push({
          type: 'WARNING',
          message: 'FRONTEND_URL no está configurado'
        });
      }
    }
    
    if (validationResults.length === 0) {
      validationResults.push({
        type: 'SUCCESS',
        message: 'Configuración del webhook válida'
      });
    }
    
    return {
      success: true,
      config,
      validationResults
    };
  }

  @Post('test-signature')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook signature verification' })
  @ApiResponse({ status: 200, description: 'Signature test completed' })
  async testSignatureVerification(@Body() testData?: any): Promise<any> {
    console.log('🧪 TESTING WEBHOOK SIGNATURE VERIFICATION 🧪');
    
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) {
      return {
        success: false,
        error: 'WOMPI_EVENTS_SECRET not configured'
      };
    }
    
    // Crear un webhook de prueba con firma válida
    const timestamp = Math.floor(Date.now() / 1000);
    const testWebhookData = testData || {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'test-transaction-123',
          status: 'APPROVED',
          amount_in_cents: 1000000,
          payment_link_id: 'test-payment-link-123'
        }
      },
      timestamp: timestamp
    };
    
    // Generar firma válida
    const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
    
    let concat = '';
    for (const prop of properties) {
      const value = prop.split('.').reduce((obj, key) => obj && obj[key], testWebhookData.data);
      if (value !== undefined && value !== null) {
        concat += value;
      }
    }
    concat += timestamp;
    concat += secret;
    
    const checksum = crypto.createHash('sha256').update(concat).digest('hex');
    
    const webhookWithSignature = {
      ...testWebhookData,
      signature: {
        checksum,
        properties
      }
    };
    
    console.log('📋 Test webhook data:', JSON.stringify(webhookWithSignature, null, 2));
    
    // Verificar la firma
    const isValid = await this.paymentService.wompiService.verifyWebhookSignature(webhookWithSignature);
    
    return {
      success: true,
      testWebhookData: webhookWithSignature,
      signatureValid: isValid,
      secret: secret ? '[CONFIGURED]' : '[NOT CONFIGURED]',
      timestamp,
      concatenatedString: concat.replace(secret, '[SECRET]'),
      calculatedChecksum: checksum
    };
  }
}