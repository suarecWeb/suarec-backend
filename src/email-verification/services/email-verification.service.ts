// src/email-verification/services/email-verification.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerification } from '../entities/email-verification.entity';
import { User } from '../../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger('EmailVerificationService');

  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendVerificationEmail(userId: number, email: string): Promise<void> {
    try {
      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      // Generar token único
      const token = crypto.randomBytes(32).toString('hex');
      
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

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const verification = await this.emailVerificationRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!verification) {
        return { success: false, message: 'Token de verificación inválido' };
      }

      // Verificar si el token ha expirado
      if (new Date() > verification.expires_at) {
        await this.emailVerificationRepository.remove(verification);
        return { success: false, message: 'El token de verificación ha expirado' };
      }

      // Marcar email como verificado
      verification.verified = true;
      await this.emailVerificationRepository.save(verification);

      // Actualizar el usuario para marcar el email como verificado
      await this.userRepository.update(
        { id: verification.user.id },
        { email_verified: true, email_verified_at: new Date() }
      );

      return { success: true, message: 'Email verificado exitosamente' };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException('Usuario no encontrado con ese email');
      }

      if (user.email_verified) {
        throw new BadRequestException('El email ya está verificado');
      }

      await this.sendVerificationEmail(user.id, email);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private async sendEmailWithBrevo(email: string, token: string, userName: string): Promise<void> {
    try {
      const brevo = require('@getbrevo/brevo');
      let apiInstance = new brevo.TransactionalEmailsApi();
      
      let apiKey = apiInstance.authentications['apiKey'];
      apiKey.apiKey = process.env.BREVO_API;
      
      let sendSmtpEmail = new brevo.SendSmtpEmail();

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
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}" 
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
                  ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}
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

      // contactosuarec -> publicidad, etc
      sendSmtpEmail.sender = { "name": "SUAREC", "email": "contactosuarec@gmail.com" };
      sendSmtpEmail.to = [{ "email": email, "name": userName }];
      sendSmtpEmail.replyTo = { "email": "soportesuarec@gmail.com" };

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw new InternalServerErrorException('Error al enviar email de verificación');
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

    if (error.code === '23505') {
      throw new BadRequestException('Duplicate entry: ' + error.detail);
    }

    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}