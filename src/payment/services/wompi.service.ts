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

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      "WOMPI_BASE_URL",
      "https://production.wompi.co/v1",
    );
    this.publicKey = this.configService.get<string>("WOMPI_PUBLIC_KEY");
    this.privateKey = this.configService.get<string>("WOMPI_PRIVATE_KEY");

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

      const response = await axios.post(
        `${this.baseUrl}/transactions`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
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

      const response = await axios.get(
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
        console.error("WOMPI_EVENTS_SECRET is not set");
        return false;
      }

      console.log("🔍 Verificando firma del webhook...");
      console.log("Event body keys:", Object.keys(eventBody));

      // Verificar estructura del webhook
      const { signature, timestamp, data } = eventBody;

      if (!signature || !timestamp || !data) {
        console.error(
          "❌ Webhook structure invalid - missing signature, timestamp, or data",
        );
        return false;
      }

      if (!signature.properties || !signature.checksum) {
        console.error(
          "❌ Signature structure invalid - missing properties or checksum",
        );
        return false;
      }

      console.log("Signature properties:", signature.properties);
      console.log("Timestamp:", timestamp);
      console.log("Received checksum:", signature.checksum);

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
        console.log(`Property: ${prop}, Value: ${value}`);
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

      console.log("Calculated checksum:", calculatedChecksum);
      console.log("Received checksum:", signature.checksum);

      // 5. Comparar con el checksum recibido (case insensitive)
      const isValid =
        calculatedChecksum.toLowerCase() === signature.checksum.toLowerCase();
      console.log("Signature valid:", isValid);

      return isValid;
    } catch (error) {
      console.error("❌ Error verifying webhook signature:", error);
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
    amount,
    currency,
    redirect_url,
    single_use = false,
    collect_shipping = false,
  }: {
    name: string;
    description: string;
    amount: number;
    currency: string;
    redirect_url: string;
    single_use?: boolean;
    collect_shipping?: boolean;
  }) {
    const url = `${this.baseUrl}/payment_links`;

    // Extraer el transaction_id de la URL de éxito
    const urlParts = redirect_url.split("?");
    const transactionId = urlParts[1]?.split("=")[1];

    console.log("🔗 URLs configuradas para el pago:");
    console.log("  - Success URL:", redirect_url);
    console.log("  - Transaction ID:", transactionId);

    const payload: any = {
      name,
      description,
      single_use,
      collect_shipping,
      currency,
      amount_in_cents: Math.round(amount * 100),
      redirect_url: redirect_url, // URL de éxito
      // Configurar tiempo de expiración
      expire_in: "7200", // 2 horas de expiración
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data.data;
  }
}
