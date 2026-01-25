import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { User } from '../user/entities/user.entity';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class ForgotPasswordService {
  constructor(
    @InjectRepository(PasswordResetCode)
    private readonly resetCodeRepository: Repository<PasswordResetCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendCode(sendCodeDto: SendCodeDto): Promise<{ message: string }> {
    const { email } = sendCodeDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Este correo no está registrado');
    }

    // Invalidar códigos anteriores
    await this.resetCodeRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const resetCode = this.resetCodeRepository.create({
      code,
      email,
      userId: user.id,
      expiresAt,
    });
    await this.resetCodeRepository.save(resetCode);

    await this.sendEmailWithCode(email, code, user.name || 'Usuario');

    return { message: 'Código enviado exitosamente' };
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto): Promise<{ message: string; valid: boolean }> {
    const { email, code } = verifyCodeDto;

    const resetCode = await this.resetCodeRepository.findOne({
      where: {
        email,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetCode) {
      throw new BadRequestException('Código inválido o expirado');
    }

    return { message: 'Código válido', valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = resetPasswordDto;

    const resetCode = await this.resetCodeRepository.findOne({
      where: {
        email,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetCode) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const user = await this.userRepository.findOne({ where: { id: resetCode.userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    await this.userRepository.save(user);

    resetCode.used = true;
    await this.resetCodeRepository.save(resetCode);

    return { message: 'Contraseña actualizada exitosamente' };
  }

  private async sendEmailWithCode(email: string, code: string, userName: string): Promise<void> {
    const brevo = require('@getbrevo/brevo');
    const apiInstance = new brevo.TransactionalEmailsApi();

    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API;

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = '{{params.subject}}';
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #097EEC 0%, #0A6BC7 100%); border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Suarec</h1>
              <p style="color: #e0e0e0; margin-top: 10px;">Recuperación de contraseña</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0;">
              <h2 style="color: #333333; margin-top: 0;">¡Hola, ${userName}!</h2>
              <p style="color: #666666; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en Suarec.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666666; margin-bottom: 10px;">Tu código de verificación es:</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; display: inline-block;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #097EEC;">${code}</span>
                </div>
                <p style="color: #999999; font-size: 12px; margin-top: 15px;">
                  Este código expira en 15 minutos
                </p>
              </div>
              
              <p style="color: #666666; line-height: 1.6;">
                Si no solicitaste este cambio, puedes ignorar este correo.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Suarec. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: 'Suarec',
      email: process.env.BREVO_SENDER_EMAIL || 'techsuarec@gmail.com',
    };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.replyTo = {
      email: process.env.BREVO_REPLY_TO_EMAIL || 'techsuarec@gmail.com',
    };
    sendSmtpEmail.params = {
      subject: 'Código de verificación - Suarec',
    };

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`Código de recuperación enviado a: ${email}`);
    } catch (error) {
      console.error('Error enviando correo:', error);
      throw new BadRequestException('Error al enviar el correo');
    }
  }
}
