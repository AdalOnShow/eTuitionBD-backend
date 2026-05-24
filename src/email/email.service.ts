/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import nodemailer from 'nodemailer';

type SendMailResponse = { messageId: string };

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor() {
    this.from = process.env.SMTP_USER || 'no-reply@example.com';

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (this.isDev) {
      this.logger.debug(`SMTP User: ${process.env.SMTP_USER || 'MISSING'}`);
      this.logger.debug(`From email: ${this.from}`);
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    try {
      if (this.isDev) {
        this.logger.log(`📧 Sending verification email to: ${email}`);
        this.logger.debug(`   Verification code: ${code}`);
      }

      const info = (await this.transporter.sendMail({
        from: `"eTuitionBD" <${this.from}>`,
        to: email,
        subject: 'Verify your eTuitionBD account',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Verify your email</h2>
            <p>Use the code below to verify your eTuitionBD account. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 24px; background: #f4f4f5; border-radius: 8px; text-align: center;">
              ${code}
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">
              If you did not create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      })) as SendMailResponse;

      if (this.isDev) {
        this.logger.log(
          `✅ Verification email sent successfully to: ${email} (MessageId: ${info.messageId})`,
        );
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to send verification email to ${email}: ${errMsg}`,
      );
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    try {
      if (this.isDev) {
        this.logger.log(`📧 Sending password reset email to: ${email}`);
        this.logger.debug(`   Reset code: ${code}`);
      }

      const info = (await this.transporter.sendMail({
        from: `"eTuitionBD" <${this.from}>`,
        to: email,
        subject: 'Reset your eTuitionBD password',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Reset your password</h2>
            <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 24px; background: #f4f4f5; border-radius: 8px; text-align: center;">
              ${code}
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        `,
      })) as SendMailResponse;

      if (this.isDev) {
        this.logger.log(
          `✅ Password reset email sent successfully to: ${email} (MessageId: ${info.messageId})`,
        );
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to send password reset email to ${email}: ${errMsg}`,
      );
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }
}
