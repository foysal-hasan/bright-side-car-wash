import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import appConfig from '../config/app.config';

@Injectable()
export class MailService {
  private readonly logger: Logger = new Logger(MailService.name) ;

  constructor(
    @InjectQueue('mail-queue') private queue: Queue,
    private mailerService: MailerService,
  ) {
   
  }

  async sendMemberInvitation({ user, member, url }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendMemberInvitation', {
        to: member.email,
        from: from,
        subject: subject,
        template: 'member-invitation',
        context: {
          user: user,
          member: member,
          url: url,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  // send invite email to staff
  async sendInviteEmail({ to, firstName, inviteUrl }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = `You're invited to join ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendInviteEmail', {
        to: to,
        from: from,
        subject: subject,
        template: 'staff-invite',
        context: {
          name: firstName,
          inviteUrl: inviteUrl,
          appName: appConfig().app.name,
          supportEmail: from,
        },
      });

    } catch (error) {
      this.logger.error(`Failed to queue invite email to ${to}: ${error?.message ? error.message : error}`);
    }
  }



  // send otp code for email verification
  async sendOtpCodeToEmail({ first_name, email, otp }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = 'Email Verification';

      // add to queue
      await this.queue.add('sendOtpCodeToEmail', {
        to: email,
        from: from,
        subject: subject,
        template: 'email-verification',
        context: {
          name: first_name,
          otp: otp,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to queue OTP email to ${email}: ${err?.message ? err.message : err}`);
    }
  }

  async sendVerificationLink(params: {
    email: string;
    name: string;
    token: string;
    type: string;
  }) {
    try {
      const verificationLink = `${appConfig().app.client_app_url}/verify-email?token=${params.token}&email=${params.email}&type=${params.type}`;

      // add to queue
      await this.queue.add('sendVerificationLink', {
        to: params.email,
        subject: 'Verify Your Email',
        template: './verification-link',
        context: {
          name: params.name,
          verificationLink,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to queue verification link email to ${params.email}: ${error?.message ? error.message : error}`);
    }
  }

   async sendSmsOtpCode(to: string, otp: string) {
    try {
      await this.queue.add('sendSmsOtpCode', {
        to: to,
        otp: otp,
      });
    } catch (error) {
      this.logger.error(`Failed to queue SMS OTP to ${to}: ${error?.message ? error.message : error}`);
    }
  }
}
