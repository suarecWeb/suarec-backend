import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar el transporter de email (puedes usar Gmail, SendGrid, etc.)
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Cambiar según tu proveedor
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendContractNotification(to: string, subject: string, message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Este es un mensaje automático de Suarec. No respondas a este email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async sendBidNotification(to: string, subject: string, message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Este es un mensaje automático de Suarec. No respondas a este email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendAcceptanceNotification(to: string, subject: string, message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Este es un mensaje automático de Suarec. No respondas a este email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
} 