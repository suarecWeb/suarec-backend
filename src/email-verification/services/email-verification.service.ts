// src/email-verification/services/email-verification.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailVerification } from "../entities/email-verification.entity";
import { User } from "../../user/entities/user.entity";
import { Publication } from "../../publication/entities/publication.entity";
import { ApplicationStatus } from "../../application/entities/application.entity";
import * as crypto from "crypto";

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger("EmailVerificationService");

  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>, // eslint-disable-line no-unused-vars
  ) {}

  async sendVerificationEmail(userId: number, email: string): Promise<void> {
    try {
      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      // Generar token único
      const token = crypto.randomBytes(32).toString("hex");

      // Crear registro de verificación con expiración de 24 horas
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Eliminar verificaciones anteriores para este usuario
      await this.emailVerificationRepository.delete({ user: { id: userId } });

      const verification = this.emailVerificationRepository.create({
        token,
        email,
        expires_at: expiresAt,
        user,
      });

      await this.emailVerificationRepository.save(verification);

      // Enviar email usando Brevo
      await this.sendEmailWithBrevo(email, token, user.name);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const verification = await this.emailVerificationRepository.findOne({
        where: { token },
        relations: ["user"],
      });

      if (!verification) {
        return { success: false, message: "Token de verificación inválido" };
      }

      // Verificar si el token ha expirado
      if (new Date() > verification.expires_at) {
        await this.emailVerificationRepository.remove(verification);
        return {
          success: false,
          message: "El token de verificación ha expirado",
        };
      }

      // Marcar email como verificado
      verification.verified = true;
      await this.emailVerificationRepository.save(verification);

      // Actualizar el usuario para marcar el email como verificado
      await this.userRepository.update(
        { id: verification.user.id },
        { email_verified: true, email_verified_at: new Date() },
      );

      return {
        success: true,
        message: "Correo electrónico verificado exitosamente",
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException("Usuario no encontrado con ese email");
      }

      if (user.email_verified) {
        throw new BadRequestException("El email ya está verificado");
      }

      await this.sendVerificationEmail(user.id, email);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error("Error getting user by email:", error);
      return null;
    }
  }

  private async sendEmailWithBrevo(
    email: string,
    token: string,
    userName: string,
  ): Promise<void> {
    try {
      // Validar que la API key esté configurada
      if (!process.env.BREVO_API) {
        this.logger.error("BREVO_API environment variable is not set");
        throw new InternalServerErrorException(
          "Configuración de email no válida",
        );
      }

      this.logger.log(`Attempting to send email to ${email} with Brevo API`);
      this.logger.log(
        `Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`,
      );

      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();

      const apiKey = apiInstance.authentications["apiKey"];
      apiKey.apiKey = process.env.BREVO_API;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.subject = "Verifica tu cuenta en SUAREC";
      sendSmtpEmail.htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
                <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">¡Bienvenido a la plataforma!</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 20px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">¡Hola ${userName}!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Gracias por registrarte en SUAREC. Para completar tu registro y activar tu cuenta, 
                  necesitas verificar tu dirección de correo electrónico.
                </p>
                
                <div style="margin: 40px 0;">
                  <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/verify-email?token=${token}" 
                     style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); 
                            color: white; 
                            padding: 15px 30px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: bold; 
                            font-size: 16px; 
                            display: inline-block;
                            box-shadow: 0 4px 15px rgba(9, 126, 236, 0.3);">
                    Verificar mi Email
                  </a>
                </div>
                
                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                </p>
                <p style="color: #097EEC; font-size: 12px; word-break: break-all; margin: 10px 0;">
                  ${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/verify-email?token=${token}
                </p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 14px; margin: 0;">
                    Este enlace expirará en 24 horas por seguridad.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
                  Si no creaste esta cuenta, puedes ignorar este email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Verificar que el email del remitente esté verificado en Brevo
      // IMPORTANTE: Este email debe estar verificado en tu cuenta de Brevo
      // Solo tienes verificado: dyez1110@gmail.com
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL || "contactosuarec@gmail.com";
      const replyToEmail =
        process.env.BREVO_REPLY_TO_EMAIL || "contactosuarec@gmail.com";

      this.logger.log(`Sender email: ${senderEmail}`);
      this.logger.log(`Reply to email: ${replyToEmail}`);
      this.logger.log(`Recipient email: ${email}`);
      this.logger.log(`Recipient name: ${userName}`);

      sendSmtpEmail.sender = { name: "SUAREC", email: senderEmail };
      sendSmtpEmail.to = [{ email: email, name: userName }];
      sendSmtpEmail.replyTo = { email: replyToEmail };

      this.logger.log(`Sending email with Brevo API to ${email}`);
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Brevo API response: ${JSON.stringify(response)}`);
      this.logger.log(
        `Message ID: ${response.messageId || response.body?.messageId}`,
      );
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error("Error sending verification email:", error);

      // Log more detailed error information
      if (error.response) {
        this.logger.error("Brevo API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.message) {
        this.logger.error("Error message:", error.message);
      }

      if (error.code) {
        this.logger.error("Error code:", error.code);
      }

      throw new InternalServerErrorException(
        "Error al enviar email de verificación",
      );
    }
  }

  async sendApplicationStatusEmailWithBrevo(
    email: string,
    candidateName: string,
    companyName: string,
    jobTitle: string,
    status:
      | ApplicationStatus.INTERVIEW
      | ApplicationStatus.ACCEPTED
      | ApplicationStatus.REJECTED,
    customMessage?: string,
    customDescription?: string,
  ): Promise<void> {
    try {
      // Validar que la API key esté configurada
      if (!process.env.BREVO_API) {
        this.logger.error("BREVO_API environment variable is not set");
        throw new InternalServerErrorException(
          "Configuración de email no válida",
        );
      }

      this.logger.log(
        `Attempting to send application status email to ${email} with Brevo API`,
      );
      this.logger.log(
        `Status: ${status}, Job: ${jobTitle}, Company: ${companyName}`,
      );

      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();

      const apiKey = apiInstance.authentications["apiKey"];
      apiKey.apiKey = process.env.BREVO_API;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      // Configurar el contenido según el estado
      const statusConfig = {
        INTERVIEW: {
          subject: `Actualización de tu aplicación - ${companyName} - ${jobTitle}`,
          statusText: "!Has sido invitado a una entrevista!",
          statusColor: "#2563eb", // Azul
          buttonText: "Ver detalles en SUAREC",
          buttonColor: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          defaultDescription:
            "Tu perfil nos ha llamado la atención y queremos conocerte mejor.",
        },
        ACCEPTED: {
          subject: `Actualización de tu aplicación - ${companyName} - ${jobTitle}`,
          statusText: "¡Has sido contratado!",
          statusColor: "#16a34a", // Verde
          buttonText: "Iniciar conversación",
          buttonColor: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
          defaultDescription:
            "Nos complace informarte que has sido seleccionado para el puesto.",
        },
        REJECTED: {
          subject: `Actualización de tu aplicación - ${companyName} - ${jobTitle}`,
          statusText: "Decisión sobre tu aplicación",
          statusColor: "#dc2626", // Rojo
          buttonText: "Ver más oportunidades",
          buttonColor: "linear-gradient(135deg, #097EEC 0%, #2171BC 100%)",
          defaultDescription:
            "Gracias por tu interés en esta posición. Aunque en esta ocasión no continuaremos con tu proceso, valoramos mucho tu participación.",
        },
      };

      const config = statusConfig[status];
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // Usar descripción personalizada o la por defecto
      const description = customDescription || config.defaultDescription;

      sendSmtpEmail.subject = config.subject;
      sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
              <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Conectamos talento. Construimos futuro</p>
            </div>
            
            <!-- Status Badge -->
            <div style="padding: 20px; text-align: center; background-color: #f8fafc;">
              <div style="display: inline-flex; align-items: center; gap: 20px; background: ${config.statusColor}; color: white; padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12); font-weight: 600; font-size: 16px; border: 2px solid white;">
                <span>${config.statusText}</span>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 0px 30px;">
              <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">¡Hola ${candidateName}!</h3>
              
              <!-- Job Information -->
              <div style="background-color: #f8fafc; border-left: 4px solid #097EEC; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📋 Información del puesto:</h4>
                <p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Posición:</strong> ${jobTitle}</p>
                <p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Empresa:</strong> ${companyName}</p>
              </div>
              
              <!-- Custom Message -->
              ${
                customMessage
                  ? `
                <div style="background-color: #fef7ff; border: 1px solid #e879f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h4 style="color: #86198f; margin: 0 0 10px 0; font-size: 16px;">💬 Mensaje adicional de ${companyName}:</h4>
                  <p style="color: #701a75; font-size: 15px; line-height: 1.5; margin: 0; font-style: italic;">
                    "${customMessage}"
                  </p>
                </div>
              `
                  : description
              }
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${frontendUrl}/chat" 
                   style="background: ${config.buttonColor}; 
                          color: white; 
                          padding: 16px 32px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(9, 126, 236, 0.3);
                          transition: transform 0.2s;">
                  ${config.buttonText}
                </a>
              </div>
              
              ${
                status === ApplicationStatus.INTERVIEW
                  ? `
                <!-- Interview Tips -->
                <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">💡 Consejos para tu entrevista:</h4>
                  <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Revisa tu CV y la descripción del puesto</li>
                    <li>Prepara preguntas sobre la empresa y el rol</li>
                    <li>Practica presentarte en 2-3 minutos</li>
                    <li>Ten ejemplos específicos de tu experiencia</li>
                  </ul>
                </div>
              `
                  : ""
              }
              
              ${
                status === "ACCEPTED"
                  ? `
                <!-- Next Steps -->
                <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">🚀 Próximos pasos:</h4>
                  <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>La empresa se pondrá en contacto contigo pronto</li>
                    <li>Revisa tu chat en SUAREC para más detalles</li>
                    <li>Prepara la documentación que puedan solicitar</li>
                    <li>¡Celebra este logro! 🎉</li>
                  </ul>
                </div>
              `
                  : ""
              }
              
              ${
                status === ApplicationStatus.REJECTED
                  ? `
                <!-- Encouragement -->
                <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">🌟 No te desanimes:</h4>
                  <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Hay muchas más oportunidades esperándote</li>
                    <li>Cada proceso es una experiencia valiosa</li>
                    <li>Continúa aplicando a más posiciones</li>
                    <li>Considera el feedback para mejorar</li>
                  </ul>
                </div>
              `
                  : ""
              }
              
              <!-- Contact Info -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Si tienes preguntas, no dudes en contactar a ${companyName} a través de SUAREC
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <div style="margin-bottom: 15px;">
                <a href="${frontendUrl}" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Visitar SUAREC
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/profile" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Mi Perfil
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/feed" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Ver Empleos
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0;">
                © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Este email fue enviado porque aplicaste a un puesto en nuestra plataforma.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

      // Configurar remitente y destinatario
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL || "contactosuarec@gmail.com";
      const replyToEmail =
        process.env.BREVO_REPLY_TO_EMAIL || "contactosuarec@gmail.com";

      this.logger.log(`Sender email: ${senderEmail}`);
      this.logger.log(`Reply to email: ${replyToEmail}`);
      this.logger.log(`Recipient email: ${email}`);
      this.logger.log(`Recipient name: ${candidateName}`);

      sendSmtpEmail.sender = { name: "SUAREC", email: senderEmail };
      sendSmtpEmail.to = [{ email: email, name: candidateName }];
      sendSmtpEmail.replyTo = { email: replyToEmail };

      this.logger.log(
        `Sending application status email with Brevo API to ${email}`,
      );
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Brevo API response: ${JSON.stringify(response)}`);
      this.logger.log(
        `Message ID: ${response.messageId || response.body?.messageId}`,
      );
      this.logger.log(
        `Application status email sent to ${email} for status: ${status}`,
      );
    } catch (error) {
      this.logger.error("Error sending application status email:", error);

      // Log more detailed error information
      if (error.response) {
        this.logger.error("Brevo API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.message) {
        this.logger.error("Error message:", error.message);
      }

      if (error.code) {
        this.logger.error("Error code:", error.code);
      }

      throw new InternalServerErrorException(
        "Error al enviar email de notificación de aplicación",
      );
    }
  }

  async sendServiceContractNotificationEmail(
    recipientEmail: string,
    recipientName: string,
    notificationType: 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS',
    contractData: {
      contractId: string;
      serviceTitle: string;
      clientName?: string;
      providerName?: string;
      agreedPrice?: number;
      currency?: string;
      customMessage?: string;
    }
  ): Promise<void> {
    try {
      // Validar que la API key esté configurada
      if (!process.env.BREVO_API) {
        this.logger.error("BREVO_API environment variable is not set");
        throw new InternalServerErrorException(
          "Configuración de email no válida",
        );
      }

      this.logger.log(
        `Attempting to send service contract notification email to ${recipientEmail} with Brevo API`,
      );
      this.logger.log(
        `Notification type: ${notificationType}, Service: ${contractData.serviceTitle}`,
      );

      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();

      const apiKey = apiInstance.authentications["apiKey"];
      apiKey.apiKey = process.env.BREVO_API;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      // Configurar el contenido según el tipo de notificación
      const notificationConfig = {
        ACCEPTED: {
          subject: `Contratación aceptada - ${contractData.serviceTitle}`,
          statusText: "¡Tu contratación ha sido aceptada!",
          statusColor: "#16a34a", // Verde
          statusIcon: "✅",
          buttonText: "Ir al contrato",
          buttonColor: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
          description: `${contractData.providerName} ha aceptado tu solicitud para el servicio "${contractData.serviceTitle}". Ya pueden comenzar a coordinar los detalles.`,
        },
        REJECTED: {
          subject: `Contratación rechazada - ${contractData.serviceTitle}`,
          statusText: "Contratación rechazada",
          statusColor: "#dc2626", // Rojo
          statusIcon: "❌",
          buttonText: "Buscar otros proveedores",
          buttonColor: "linear-gradient(135deg, #097EEC 0%, #2171BC 100%)",
          description: `${contractData.providerName} ha rechazado tu solicitud para el servicio "${contractData.serviceTitle}". No te preocupes, hay muchos otros proveedores disponibles.`,
        },
        IN_PROGRESS: {
          subject: `Negociación en curso - ${contractData.serviceTitle}`,
          statusText: "Negociación en progreso",
          statusColor: "#f59e0b", // Amarillo/Naranja
          statusIcon: "�",
          buttonText: "Continuar negociación",
          buttonColor: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          description: `La negociación para el servicio "${contractData.serviceTitle}" está en curso. Ambas partes están coordinando los detalles finales como precio, fecha y hora.`,
        },
      };

      const config = notificationConfig[notificationType];
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      sendSmtpEmail.subject = config.subject;
      sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
              <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Conectamos servicios. Creamos soluciones</p>
            </div>
            
            <!-- Status Badge -->
            <div style="padding: 20px; text-align: center; background-color: #f8fafc;">
              <div style="display: inline-flex; align-items: center; gap: 10px; background: ${config.statusColor}; color: white; padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12); font-weight: 600; font-size: 16px; border: 2px solid white;">
                <span style="font-size: 20px;">${config.statusIcon}</span>
                <span>${config.statusText}</span>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 0px 30px;">
              <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">¡Hola ${recipientName}!</h3>
              
              <!-- Service Information -->
              <div style="background-color: #f8fafc; border-left: 4px solid #097EEC; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">🔧 Información del servicio:</h4>
                <p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Servicio:</strong> ${contractData.serviceTitle}</p>
                ${contractData.clientName ? `<p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Cliente:</strong> ${contractData.clientName}</p>` : ''}
                ${contractData.providerName ? `<p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Proveedor:</strong> ${contractData.providerName}</p>` : ''}
                ${contractData.agreedPrice ? `<p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Precio acordado:</strong> $${contractData.agreedPrice.toLocaleString()} ${contractData.currency || 'COP'}</p>` : ''}
                <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>ID del contrato:</strong> ${contractData.contractId}</p>
              </div>
              
              <!-- Description -->
              <div style="margin: 20px 0;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${config.description}
                </p>
              </div>
              
              <!-- Custom Message -->
              ${
                contractData.customMessage
                  ? `
                <div style="background-color: #fef7ff; border: 1px solid #e879f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h4 style="color: #86198f; margin: 0 0 10px 0; font-size: 16px;">💬 Mensaje adicional:</h4>
                  <p style="color: #701a75; font-size: 15px; line-height: 1.5; margin: 0; font-style: italic;">
                    "${contractData.customMessage}"
                  </p>
                </div>
              `
                  : ''
              }
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${frontendUrl}/contracts" 
                   style="background: ${config.buttonColor}; 
                          color: white; 
                          padding: 16px 32px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(9, 126, 236, 0.3);
                          transition: transform 0.2s;">
                  ${config.buttonText}
                </a>
              </div>
              
              ${
                notificationType === 'ACCEPTED'
                  ? `
                <!-- Next Steps -->
                <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">� Próximos pasos:</h4>
                  <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Coordina los detalles finales con el proveedor</li>
                    <li>Confirma fecha, hora y lugar del servicio</li>
                    <li>Mantén la comunicación a través de SUAREC</li>
                    <li>Prepara todo lo necesario para el servicio</li>
                  </ul>
                </div>
              `
                  : ''
              }
              
              ${
                notificationType === 'REJECTED'
                  ? `
                <!-- Encouragement -->
                <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">🌟 No te desanimes:</h4>
                  <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Hay muchas más oportunidades esperándote</li>
                    <li>Cada proceso es una experiencia valiosa</li>
                    <li>Continúa buscando otros proveedores</li>
                    <li>Considera ajustar los detalles de tu solicitud</li>
                  </ul>
                </div>
              `
                  : ''
              }
              
              ${
                notificationType === 'IN_PROGRESS'
                  ? `
                <!-- Negotiation Tips -->
                <div style="background-color: #fefce8; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #ca8a04; margin: 0 0 15px 0; font-size: 16px;">💡 Durante la negociación:</h4>
                  <ul style="color: #a16207; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Comunica claramente tus necesidades y disponibilidad</li>
                    <li>Negocia precio, fecha y hora de manera justa</li>
                    <li>Confirma todos los detalles antes de finalizar</li>
                    <li>Mantén la comunicación respetuosa y profesional</li>
                  </ul>
                </div>
              `
                  : ''
              }
              
              <!-- Contact Info -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Si tienes preguntas sobre este contrato, utiliza el chat de SUAREC para comunicarte directamente
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <div style="margin-bottom: 15px;">
                <a href="${frontendUrl}" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Visitar SUAREC
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/contracts" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Mis Contratos
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/feed" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Ver Publicaciones
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0;">
                © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Este email fue enviado porque participas en una contratación de servicio en nuestra plataforma.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

      // Configurar remitente y destinatario
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL || "contactosuarec@gmail.com";
      const replyToEmail =
        process.env.BREVO_REPLY_TO_EMAIL || "contactosuarec@gmail.com";

      this.logger.log(`Sender email: ${senderEmail}`);
      this.logger.log(`Reply to email: ${replyToEmail}`);
      this.logger.log(`Recipient email: ${recipientEmail}`);
      this.logger.log(`Recipient name: ${recipientName}`);

      sendSmtpEmail.sender = { name: "SUAREC", email: senderEmail };
      sendSmtpEmail.to = [{ email: recipientEmail, name: recipientName }];
      sendSmtpEmail.replyTo = { email: replyToEmail };

      this.logger.log(
        `Sending service contract notification email with Brevo API to ${recipientEmail}`,
      );
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Brevo API response: ${JSON.stringify(response)}`);
      this.logger.log(
        `Message ID: ${response.messageId || response.body?.messageId}`,
      );
      this.logger.log(
        `Service contract notification email sent to ${recipientEmail} for type: ${notificationType}`,
      );
    } catch (error) {
      this.logger.error("Error sending service contract notification email:", error);

      // Log more detailed error information
      if (error.response) {
        this.logger.error("Brevo API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.message) {
        this.logger.error("Error message:", error.message);
      }

      if (error.code) {
        this.logger.error("Error code:", error.code);
      }

      throw new InternalServerErrorException(
        "Error al enviar email de notificación de contrato de servicio",
      );
    }
  }

  async sendEmployeeRemovalNotificationEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    removalReason?: 'TERMINATION',
    customMessage?: string,
    endDate?: Date
  ): Promise<void> {
    try {
      // Validar que la API key esté configurada
      if (!process.env.BREVO_API) {
        this.logger.error("BREVO_API environment variable is not set");
        throw new InternalServerErrorException(
          "Configuración de email no válida",
        );
      }

      this.logger.log(
        `Attempting to send employee removal notification email to ${employeeEmail} with Brevo API`,
      );
      this.logger.log(
        `Company: ${companyName}, Reason: ${removalReason || 'Not specified'}`,
      );

      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();

      const apiKey = apiInstance.authentications["apiKey"];
      apiKey.apiKey = process.env.BREVO_API;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      // Configurar el contenido según la razón de la remoción
      const reasonConfig = {
        TERMINATION: {
          subject: `Actualización de tu empleo en ${companyName}`,
          statusText: "Fin de relación laboral",
          statusColor: "#dc2626", // Rojo
          statusIcon: "📋",
          buttonText: "Buscar nuevas oportunidades",
          buttonColor: "linear-gradient(135deg, #097EEC 0%, #2171BC 100%)",
          description: `Tu relación laboral con ${companyName} ha finalizado. Agradecemos tu tiempo y dedicación durante tu período de trabajo con nosotros.`,
        },
      };

      const config = reasonConfig[removalReason || 'OTHER'];
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const formattedEndDate = endDate ? endDate.toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');

      sendSmtpEmail.subject = config.subject;
      sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #097EEC 0%, #2171BC 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SUAREC</h1>
              <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Conectamos talento. Construimos futuro</p>
            </div>
            
            <!-- Status Badge -->
            <div style="padding: 20px; text-align: center; background-color: #f8fafc;">
              <div style="display: inline-flex; align-items: center; gap: 10px; background: ${config.statusColor}; color: white; padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12); font-weight: 600; font-size: 16px; border: 2px solid white;">
                <span style="font-size: 20px;">${config.statusIcon}</span>
                <span>${config.statusText}</span>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 0px 30px;">
              <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">¡Hola ${employeeName}!</h3>
              
              <!-- Employment Information -->
              <div style="background-color: #f8fafc; border-left: 4px solid #097EEC; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">🏢 Información de empleo:</h4>
                <p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Empresa:</strong> ${companyName}</p>
                <p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Fecha de finalización:</strong> ${formattedEndDate}</p>
                ${removalReason ? `<p style="color: #6b7280; margin: 5px 0; font-size: 16px;"><strong>Motivo:</strong> ${removalReason === 'TERMINATION' ? 'Terminación' : removalReason === 'RESIGNATION' ? 'Renuncia' : removalReason === 'END_OF_CONTRACT' ? 'Fin de contrato' : 'Otros'}</p>` : ''}
              </div>
              
              <!-- Description -->
              <div style="margin: 20px 0;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${config.description}
                </p>
              </div>
              
              <!-- Custom Message -->
              ${
                customMessage
                  ? `
                <div style="background-color: #fef7ff; border: 1px solid #e879f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h4 style="color: #86198f; margin: 0 0 10px 0; font-size: 16px;">💬 Mensaje de ${companyName}:</h4>
                  <p style="color: #701a75; font-size: 15px; line-height: 1.5; margin: 0; font-style: italic;">
                    "${customMessage}"
                  </p>
                </div>
              `
                  : ''
              }
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${frontendUrl}/feed" 
                   style="background: ${config.buttonColor}; 
                          color: white; 
                          padding: 16px 32px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(9, 126, 236, 0.3);
                          transition: transform 0.2s;">
                  ${config.buttonText}
                </a>
              </div>
              
              ${
                removalReason === 'TERMINATION'
                  ? `
                <!-- Next Steps -->
                <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">💼 Próximos pasos:</h4>
                  <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Actualiza tu perfil en SUAREC para nuevas oportunidades</li>
                    <li>Completa cualquier proceso administrativo pendiente</li>
                    <li>Solicita referencias laborales si es necesario</li>
                    <li>Explora las nuevas ofertas disponibles en la plataforma</li>
                  </ul>
                </div>
              `
                  : ''
              }
              
              <!-- Important Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ Información importante:</h4>
                <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">
                  Tu acceso a los recursos específicos de ${companyName} ha sido desactivado. 
                  Sin embargo, tu cuenta de SUAREC permanece activa y puedes continuar 
                  explorando nuevas oportunidades laborales en nuestra plataforma.
                </p>
              </div>
              
              <!-- Contact Info -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Si tienes dudas sobre este proceso, contacta directamente con ${companyName} o con nuestro soporte
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <div style="margin-bottom: 15px;">
                <a href="${frontendUrl}" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Visitar SUAREC
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/profile" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Mi Perfil
                </a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${frontendUrl}/feed" style="color: #097EEC; text-decoration: none; font-weight: 500;">
                  Ver Empleos
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0;">
                © ${new Date().getFullYear()} SUAREC. Todos los derechos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Este email fue enviado porque hubo un cambio en tu situación laboral registrada en nuestra plataforma.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

      // Configurar remitente y destinatario
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL || "contactosuarec@gmail.com";
      const replyToEmail =
        process.env.BREVO_REPLY_TO_EMAIL || "contactosuarec@gmail.com";

      this.logger.log(`Sender email: ${senderEmail}`);
      this.logger.log(`Reply to email: ${replyToEmail}`);
      this.logger.log(`Recipient email: ${employeeEmail}`);
      this.logger.log(`Recipient name: ${employeeName}`);

      sendSmtpEmail.sender = { name: "SUAREC", email: senderEmail };
      sendSmtpEmail.to = [{ email: employeeEmail, name: employeeName }];
      sendSmtpEmail.replyTo = { email: replyToEmail };

      this.logger.log(
        `Sending employee removal notification email with Brevo API to ${employeeEmail}`,
      );
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Brevo API response: ${JSON.stringify(response)}`);
      this.logger.log(
        `Message ID: ${response.messageId || response.body?.messageId}`,
      );
      this.logger.log(
        `Employee removal notification email sent to ${employeeEmail} from company: ${companyName}`,
      );
    } catch (error) {
      this.logger.error("Error sending employee removal notification email:", error);

      // Log more detailed error information
      if (error.response) {
        this.logger.error("Brevo API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.message) {
        this.logger.error("Error message:", error.message);
      }

      if (error.code) {
        this.logger.error("Error code:", error.code);
      }

      throw new InternalServerErrorException(
        "Error al enviar email de notificación de remoción de empleado",
      );
    }
  }

  private handleDBErrors(error: any) {
    this.logger.error(error);

    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === "23505") {
      throw new BadRequestException("Duplicate entry: " + error.detail);
    }

    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }
}
