import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WompiPaymentType } from '../../enums/paymentMethod.enum';
import * as crypto from 'crypto';

export interface WompiTransactionRequest {
  amount_in_cents: number;
  currency: string;
  reference: string;
  public_key: string;
  redirect_url?: string;
  customer_email?: string;
  acceptance_token?: string;
  payment_method?: {
    type: string;
    installments?: number;
  };
}

export interface WompiTransactionResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    reference: string;
    payment_link: string;
    acceptance_token: string;
    payment_method?: {
      type: string;
      installments?: number;
    };
  };
}

export interface WompiWebhookData {
  event: string;
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    reference: string;
    payment_link: string;
    acceptance_token: string;
    finalization_date?: string;
    payment_method?: {
      type: string;
      installments?: number;
    };
  };
}

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('WOMPI_BASE_URL', 'https://production.wompi.co/v1');
    this.publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
    this.privateKey = this.configService.get<string>('WOMPI_PRIVATE_KEY');

    if (!this.publicKey || !this.privateKey) {
      this.logger.warn('Wompi keys not configured. Payment processing will be disabled.');
    }
  }

  async createTransaction(
    amount: number,
    currency: string,
    reference: string,
    customerEmail?: string,
    redirectUrl?: string,
    paymentType?: WompiPaymentType,
    installments?: number
  ): Promise<WompiTransactionResponse> {
    try {
      if (!this.publicKey) {
        throw new Error('Wompi public key not configured');
      }

      const requestData: WompiTransactionRequest = {
        amount_in_cents: Math.round(amount * 100), // Convert to cents
        currency: currency.toUpperCase(),
        reference,
        public_key: this.publicKey,
        redirect_url: redirectUrl,
        customer_email: customerEmail,
      };

      // Add payment method if specified
      if (paymentType) {
        requestData.payment_method = {
          type: this.mapPaymentType(paymentType),
        };

        if (installments && installments > 1) {
          requestData.payment_method.installments = installments;
        }
      }

      this.logger.log(`Creating Wompi transaction: ${JSON.stringify(requestData)}`);

      const response = await axios.post(
        `${this.baseUrl}/transactions`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.privateKey}`,
          },
        }
      );

      this.logger.log(`Wompi transaction created: ${response.data.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating Wompi transaction: ${error.message}`, error.stack);
      throw new Error(`Failed to create Wompi transaction: ${error.message}`);
    }
  }

  async getTransaction(transactionId: string): Promise<WompiTransactionResponse> {
    try {
      if (!this.privateKey) {
        throw new Error('Wompi private key not configured');
      }

      const response = await axios.get(
        `${this.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.privateKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting Wompi transaction: ${error.message}`, error.stack);
      throw new Error(`Failed to get Wompi transaction: ${error.message}`);
    }
  }

  async verifyWebhookSignature(eventBody: any): Promise<boolean> {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) throw new Error('WOMPI_EVENTS_SECRET is not set');

    const { signature, timestamp, data } = eventBody;
    if (!signature || !signature.properties || !signature.checksum) return false;

    // 1. Concatenar los valores de las propiedades en orden
    let concat = '';
    for (const prop of signature.properties) {
      // Soporta propiedades anidadas tipo "transaction.id"
      const value = prop.split('.').reduce((obj, key) => obj && obj[key], data);
      concat += value;
    }

    // 2. Concatenar el timestamp
    concat += timestamp;

    // 3. Concatenar el secreto
    concat += secret;

    // 4. Calcular el hash SHA256
    const calculatedChecksum = crypto.createHash('sha256').update(concat).digest('hex').toUpperCase();

    // 5. Comparar con el checksum recibido
    return calculatedChecksum === signature.checksum;
  }

  private mapPaymentType(paymentType: WompiPaymentType): string {
    const typeMap = {
      [WompiPaymentType.CARD]: 'CARD',
      [WompiPaymentType.NEQUI]: 'NEQUI',
      [WompiPaymentType.BANCOLOMBIA_TRANSFER]: 'BANCOLOMBIA_TRANSFER',
      [WompiPaymentType.DAVIPLATA]: 'DAVIPLATA',
    };

    return typeMap[paymentType] || 'CARD';
  }

  private generateSignature(body: string): string {
    // Implement proper signature generation based on Wompi documentation
    // This is a placeholder - you should use the actual algorithm
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.privateKey)
      .update(body)
      .digest('hex');
  }

  isConfigured(): boolean {
    return !!(this.publicKey && this.privateKey);
  }
} 