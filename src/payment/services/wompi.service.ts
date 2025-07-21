import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { WompiPaymentType } from "../../enums/paymentMethod.enum";
import * as crypto from "crypto";

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
  private readonly axiosInstance;

  constructor(private configService: ConfigService) {
    // eslint-disable-line no-unused-vars
    this.baseUrl = this.configService.get<string>(
      "WOMPI_BASE_URL",
      "https://production.wompi.co/v1",
    );
    this.publicKey = this.configService.get<string>("WOMPI_PUBLIC_KEY");
    this.privateKey = this.configService.get<string>("WOMPI_PRIVATE_KEY");

    // Crear instancia de axios con configuración por defecto
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 segundos
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para logging de requests
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.log(`Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error.message);
        return Promise.reject(error);
      }
    );

    // Interceptor para logging de responses
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.log(`Response received: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.code === 'ECONNABORTED') {
          this.logger.error('Request timeout');
        } else if (error.response) {
          this.logger.error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          this.logger.error('No response received:', error.message);
        } else {
          this.logger.error('Request setup error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    if (!this.publicKey || !this.privateKey) {
      this.logger.warn(
        "Wompi keys not configured. Payment processing will be disabled.",
      );
    }
  }

  // Add email cleaning method
  private cleanEmailForPayment(email: string): string {
    if (!email || typeof email !== "string") {
      return email;
    }
    // Remove everything from + until @ (but not including @)
    const cleanedEmail = email.replace(/\+[^@]*(?=@)/g, "");
    this.logger.log(`Email cleaned: ${email} -> ${cleanedEmail}`);
    return cleanedEmail;
  }

  async createTransaction(
    amount: number,
    currency: string,
    reference: string,
    customerEmail?: string,
    redirectUrl?: string,
    paymentType?: WompiPaymentType,
    installments?: number,
    acceptance_token?: string,
    accept_personal_auth?: string,
  ): Promise<WompiTransactionResponse> {
    try {
      if (!this.privateKey) {
        throw new Error("Wompi private key not configured");
      }

      // Validate required fields
      if (!customerEmail) {
        throw new Error("Customer email is required");
      }

      if (!acceptance_token) {
        throw new Error("Acceptance token is required");
      }

      if (!accept_personal_auth) {
        throw new Error("Personal data authorization token is required");
      }

      // Clean the email to remove + aliases
      const cleanedEmail = this.cleanEmailForPayment(customerEmail);

      const requestData: any = {
        amount_in_cents: Math.round(amount * 100), // Convert to cents
        currency: currency.toUpperCase(),
        reference,
        public_key: this.publicKey,
        customer_email: cleanedEmail, // Use cleaned email
        acceptance_token: acceptance_token,
        accept_personal_auth: accept_personal_auth,
      };

      // Add redirect URL if provided
      if (redirectUrl) {
        requestData.redirect_url = redirectUrl;
      }

      // Add payment method if specified
      if (paymentType) {
        requestData.payment_method = {
          type: this.mapPaymentType(paymentType),
        };

        if (installments && installments > 1) {
          requestData.payment_method.installments = installments;
        }
      }

      this.logger.log(
        `Creating Wompi transaction: ${JSON.stringify(requestData)}`,
      );

      const response = await this.axiosInstance.post(
        `${this.baseUrl}/transactions`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      this.logger.log(
        `Wompi transaction created successfully: ${response.data.data.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating Wompi transaction: ${error.message}`);

      // Log the response for debugging
      if (error.response) {
        this.logger.error(`Wompi API Error Status: ${error.response.status}`);
        this.logger.error(
          `Wompi API Error Response: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw new Error(`Failed to create Wompi transaction: ${error.message}`);
    }
  }

  async getTransaction(
    transactionId: string,
  ): Promise<WompiTransactionResponse> {
    try {
      if (!this.privateKey) {
        throw new Error("Wompi private key not configured");
      }

      const response = await this.axiosInstance.get(
        `${this.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error getting Wompi transaction: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get Wompi transaction: ${error.message}`);
    }
  }

  async verifyWebhookSignature(eventBody: any): Promise<boolean> {
    try {
      const secret = process.env.WOMPI_EVENTS_SECRET;
      if (!secret) {
        return false;
      }

      // Verificar estructura del webhook
      const { signature, timestamp, data } = eventBody;

      if (!signature || !timestamp || !data) {
        return false;
      }

      if (!signature.properties || !signature.checksum) {
        return false;
      }

      // 1. Concatenar los valores de las propiedades en orden
      let concat = "";
      for (const prop of signature.properties) {
        // Soporta propiedades anidadas tipo "transaction.id"
        const value = prop
          .split(".")
          .reduce((obj, key) => obj && obj[key], data);
        if (value !== undefined && value !== null) {
          concat += value;
        }
      }

      // 2. Concatenar el timestamp
      concat += timestamp;

      // 3. Concatenar el secreto
      concat += secret;

      // 4. Calcular el hash SHA256
      const calculatedChecksum = crypto
        .createHash("sha256")
        .update(concat)
        .digest("hex");

      // 5. Comparar con el checksum recibido (case insensitive)
      const isValid =
        calculatedChecksum.toLowerCase() === signature.checksum.toLowerCase();

      return isValid;
    } catch (error) {
      return false;
    }
  }

  private mapPaymentType(paymentType: WompiPaymentType): string {
    const typeMap = {
      [WompiPaymentType.CARD]: "CARD",
      [WompiPaymentType.NEQUI]: "NEQUI",
      [WompiPaymentType.BANCOLOMBIA_TRANSFER]: "BANCOLOMBIA_TRANSFER",
      [WompiPaymentType.DAVIPLATA]: "DAVIPLATA",
    };

    return typeMap[paymentType] || "CARD";
  }

  private generateSignature(body: string): string {
    // Implement proper signature generation based on Wompi documentation
    // This is a placeholder - you should use the actual algorithm
    const crypto = require("crypto");
    return crypto
      .createHmac("sha256", this.privateKey)
      .update(body)
      .digest("hex");
  }

  isConfigured(): boolean {
    return !!(this.publicKey && this.privateKey);
  }

  async createPaymentLink({
    name,
    description,
    amount_in_cents,
    currency,
    redirect_url,
    single_use = false,
    collect_shipping = false,
  }: {
    name: string;
    description: string;
    amount_in_cents: number;
    currency: string;
    redirect_url: string;
    single_use?: boolean;
    collect_shipping?: boolean;
  }) {
    console.log('🔗 ===== WOMPI createPaymentLink START =====');
    console.log('📅 Timestamp:', new Date().toISOString());
    
    try {
      console.log('📥 Input parameters received:');
      console.log('  name:', JSON.stringify(name));
      console.log('  name length:', name?.length);
      console.log('  description:', JSON.stringify(description));
      console.log('  description length:', description?.length);
      console.log('  amount_in_cents:', amount_in_cents);
      console.log('  amount_in_cents type:', typeof amount_in_cents);
      console.log('  currency:', currency);
      console.log('  currency type:', typeof currency);
      console.log('  redirect_url:', redirect_url);
      console.log('  redirect_url length:', redirect_url?.length);
      console.log('  single_use:', single_use);
      console.log('  collect_shipping:', collect_shipping);

      console.log('🔧 WompiService configuration check:');
      console.log('  baseUrl:', this.baseUrl);
      console.log('  privateKey exists:', !!this.privateKey);
      console.log('  privateKey length:', this.privateKey?.length);
      console.log('  privateKey prefix:', this.privateKey?.substring(0, 12));
      console.log('  publicKey exists:', !!this.publicKey);
      console.log('  publicKey prefix:', this.publicKey?.substring(0, 10));
      console.log('  axiosInstance exists:', !!this.axiosInstance);

      const url = `${this.baseUrl}/payment_links`;
      console.log('🌐 Target URL:', url);
      
      if (!this.privateKey) {
        console.error('❌ Private key not configured!');
        throw new Error("Wompi private key not configured");
      }

      console.log('✅ Private key validation passed');

      const payload: any = {
        name,
        description,
        single_use,
        collect_shipping,
        currency,
        amount_in_cents: amount_in_cents,
        redirect_url: redirect_url,
        expire_in: "7200",
      };

      console.log('📤 Final payload prepared:');
      console.log(JSON.stringify(payload, null, 2));
      
      console.log('🔍 Payload validation:');
      console.log('  payload.name type:', typeof payload.name);
      console.log('  payload.description type:', typeof payload.description);
      console.log('  payload.amount_in_cents type:', typeof payload.amount_in_cents);
      console.log('  payload.amount_in_cents value:', payload.amount_in_cents);
      console.log('  payload.currency type:', typeof payload.currency);
      console.log('  payload.redirect_url type:', typeof payload.redirect_url);
      console.log('  payload.single_use type:', typeof payload.single_use);
      console.log('  payload.collect_shipping type:', typeof payload.collect_shipping);

      console.log('🔑 Request headers:');
      const headers = {
        Authorization: `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json',
      };
      console.log('  Authorization header length:', headers.Authorization.length);
      console.log('  Authorization starts with Bearer:', headers.Authorization.startsWith('Bearer '));
      console.log('  Content-Type:', headers['Content-Type']);

      console.log('⏳ Making HTTP POST request...');
      console.log('  URL:', url);
      console.log('  Method: POST');
      console.log('  Timeout:', this.axiosInstance.defaults.timeout);
      
      const requestStartTime = Date.now();
      
      const response = await this.axiosInstance.post(url, payload, {
        headers: headers,
      });
      
      const requestEndTime = Date.now();
      console.log(`✅ HTTP request completed in ${requestEndTime - requestStartTime}ms`);
      
      console.log('📦 Response received:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  Headers:', JSON.stringify(response.headers, null, 2));
      console.log('  Data structure:', Object.keys(response.data || {}));
      console.log('  Full Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.data) {
        console.log('✅ Payment link data found:');
        console.log('  Payment Link ID:', response.data.data.id);
        console.log('  Payment Link URL:', `https://checkout.wompi.co/l/${response.data.data.id}`);
        console.log('  Amount in cents:', response.data.data.amount_in_cents);
        console.log('  Currency:', response.data.data.currency);
      } else {
        console.warn('⚠️ Unexpected response structure - no data.data found');
      }
      
      console.log('🔗 ===== WOMPI createPaymentLink SUCCESS =====');
      return response.data.data;
      
    } catch (error) {
      console.error('🔗 ===== WOMPI createPaymentLink ERROR =====');
      console.error('❌ Error occurred in createPaymentLink:');
      console.error('  Error type:', error.constructor.name);
      console.error('  Error message:', error.message);
      
      if (error.code) {
        console.error('  Error code:', error.code);
      }
      
      if (error.response) {
        console.error('📥 HTTP Response Error Details:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  URL:', error.response.config?.url);
        console.error('  Method:', error.response.config?.method?.toUpperCase());
        console.error('  Request Headers:', JSON.stringify(error.response.config?.headers, null, 2));
        console.error('  Request Data:', JSON.stringify(error.response.config?.data, null, 2));
        console.error('  Response Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('  Response Data:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 422) {
          console.error('🚨 422 VALIDATION ERROR ANALYSIS:');
          if (error.response.data?.error?.messages) {
            console.error('  Field validation errors:');
            Object.entries(error.response.data.error.messages).forEach(([field, errors]) => {
              console.error(`    ${field}:`, errors);
            });
          }
          if (error.response.data?.error?.type) {
            console.error('  Error type:', error.response.data.error.type);
          }
        }
        
      } else if (error.request) {
        console.error('📤 HTTP Request Error (no response received):');
        console.error('  Request URL:', error.request.url);
        console.error('  Request Method:', error.request.method);
        console.error('  Request Timeout:', error.request.timeout);
        console.error('  This indicates network connectivity or server availability issues');
        
      } else {
        console.error('⚙️ Request Setup Error:');
        console.error('  Error occurred during request configuration');
      }
      
      console.error('📋 Full Error Stack:');
      console.error(error.stack);
      
      console.error('🔗 ===== WOMPI createPaymentLink ERROR END =====');
      
      // Re-throw the error to be handled by PaymentService
      throw error;
    }
  }
}
