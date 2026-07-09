import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { IMailProvider, MailSendOptions } from '../interfaces/mail-provider.interface';

@Injectable()
export class SmtpMailProvider implements IMailProvider {
  constructor(private readonly mailerService: MailerService) {}

  async send(options: MailSendOptions): Promise<string> {
    const result = await this.mailerService.sendMail({
      to: options.to,
      from: options.from
        ? options.from.name
          ? `${options.from.name} <${options.from.email}>`
          : options.from.email
        : undefined,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
    });

    return (result?.messageId || '').toString();
  }
}
