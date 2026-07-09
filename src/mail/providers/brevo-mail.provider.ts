import { Injectable, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';
import appConfig from 'src/config/app.config';
import { IMailProvider, MailSendOptions } from '../interfaces/mail-provider.interface';

@Injectable()
export class BrevoMailProvider implements IMailProvider {
  private readonly client: BrevoClient;
  private readonly logger = new Logger(BrevoMailProvider.name);

  constructor() {
    this.client = new BrevoClient({ apiKey: appConfig().campaign.brevo.apiKey });
  }

  async send(options: MailSendOptions): Promise<string> {
    const senderEmail = appConfig().mail.sender_email.trim().toLowerCase();
    const senderName = options.from?.name || appConfig().mail.sender_name || appConfig().app.name;

    const result = await this.client.transactionalEmails.sendTransacEmail({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      ...(options.cc && options.cc.length
        ? { cc: options.cc.map((email) => ({ email })) }
        : {}),
      ...(options.bcc && options.bcc.length
        ? { bcc: options.bcc.map((email) => ({ email })) }
        : {}),
      ...(options.attachments && options.attachments.length
        ? { attachment: options.attachments.map((file) => ({ url: file })) }
        : {}),
    });

    const messageId = result.messageId?.toString() || '';
    this.logger.log(`Brevo email sent to ${options.to} with messageId: ${messageId}`);
    return messageId;
  }
}
