import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendContractNotification(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    try {
      // Usar Brevo en lugar de Gmail
      await this.sendEmailWithBrevo(to, subject, message);
    } catch (error) {
      this.logger.error(`Error enviando notificación de contrato a ${to}:`, error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async sendBidNotification(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    try {
      // Usar Brevo en lugar de Gmail
      await this.sendEmailWithBrevo(to, subject, message);
    } catch (error) {
      this.logger.error(`Error enviando notificación de oferta a ${to}:`, error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async sendAcceptanceNotification(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    try {
      // Usar Brevo en lugar de Gmail
      await this.sendEmailWithBrevo(to, subject, message);
    } catch (error) {
      this.logger.error(`Error enviando notificación de aceptación a ${to}:`, error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async sendOTPNotification(
    to: string,
    clientName: string,
    otpCode: string,
    serviceTitle: string,
    providerName: string,
  ): Promise<void> {
    try {
      const subject = "Código OTP - Confirmación de Servicio Completado";
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
                <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Confirmación de Servicio</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 20px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">¡Hola ${clientName}!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  El proveedor <strong>${providerName}</strong> ha marcado el servicio <strong>"${serviceTitle}"</strong> como completado.
                </p>
                
                <div style="background-color: #f0f8ff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <p style="color: #007bff; font-size: 14px; margin-bottom: 10px; font-weight: bold;">Para confirmar que el servicio se realizó satisfactoriamente, ingresa este código:</p>
                  <div style="background-color: #007bff; color: white; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 8px; letter-spacing: 5px; font-family: monospace;">
                    ${otpCode}
                  </div>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #856404; font-size: 14px; margin: 0;">
                    ⏰ <strong>Importante:</strong> Este código expira en 24 horas.
                  </p>
                </div>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Una vez que ingreses este código en la plataforma, podrás proceder con el pago del servicio.
                </p>
                
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #721c24; font-size: 14px; margin: 0;">
                    ⚠️ <strong>Seguridad:</strong> Si no solicitaste este código o tienes alguna duda, contacta inmediatamente con soporte.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
                  Si no solicitaste este código, puedes ignorar este email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Usar Brevo en lugar de Gmail
      await this.sendEmailWithBrevo(to, subject, htmlContent);
    } catch (error) {
      this.logger.error(`Error enviando notificación OTP a ${to}:`, error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  private async sendEmailWithBrevo(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    try {
      // Validar que la API key esté configurada
      if (!process.env.BREVO_API) {
        this.logger.error("BREVO_API environment variable is not set");
        throw new Error("Configuración de email no válida");
      }

      this.logger.log(`Enviando email a ${to} con Brevo API`);

      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();

      const apiKey = apiInstance.authentications["apiKey"];
      apiKey.apiKey = process.env.BREVO_API;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;

      // Para emails simples, crear un HTML básico si solo se proporciona texto
      if (!htmlContent.includes('<html>')) {
        sendSmtpEmail.htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
                  <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Notificación del Sistema</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 20px;">
                  <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
                  <div style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    ${htmlContent.replace(/\n/g, '<br>')}
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
                  </p>
                  <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
                    Este es un mensaje automático de Suarec. No respondas a este email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `;
      }

      // Verificar que el email del remitente esté verificado en Brevo
      const senderEmail = process.env.BREVO_SENDER_EMAIL || "contactosuarec@gmail.com";
      const replyToEmail = process.env.BREVO_REPLY_TO_EMAIL || "contactosuarec@gmail.com";

      sendSmtpEmail.sender = { email: senderEmail, name: "SUAREC" };
      sendSmtpEmail.replyTo = { email: replyToEmail, name: "SUAREC" };
      sendSmtpEmail.to = [{ email: to }];

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      this.logger.log(`Email enviado exitosamente a ${to}. Message ID: ${response.messageId}`);
    } catch (error) {
      this.logger.error(`Error enviando email con Brevo a ${to}:`, error);
      throw error;
    }
  }
}
