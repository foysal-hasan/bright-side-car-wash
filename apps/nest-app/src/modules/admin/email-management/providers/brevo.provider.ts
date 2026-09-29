import { BrevoClient } from '@getbrevo/brevo';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { CampaignResult, CreateCampaignPayload, EmailOptions } from '../types/email.types';
import appConfig from 'src/config/app.config';
import { BadRequestException, Logger } from '@nestjs/common';


export class BrevoProvider implements IEmailProvider {
  private client: BrevoClient;

  private logger: Logger;

  constructor() {
    // Initialize Brevo client using your API key
    this.client = new BrevoClient({ apiKey: appConfig().campaign.brevo.apiKey });
    this.logger = new Logger(BrevoProvider.name);
  }

  async send(options: EmailOptions): Promise<String> {
    // Dynamic provider implementation goes here (e.g., transporter.sendMail)
    const result = await this.client.transactionalEmails.sendTransacEmail({
      sender: { email: options.from.email, name: options.from.name},
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      ...options.cc && options.cc.length ? { cc: options.cc.map(email => ({ email })) } : {},
      ...options.bcc && options.bcc.length ? { bcc: options.bcc.map(email => ({ email })) } : {},
      ...options.attachments && options.attachments.length ? { attachment: options.attachments.map(file => ({ url: file })) } : {},
      params: options.params || {},
    });

    this.logger.debug(`Email sent to ${options.to} with subject "${options.subject}" => Brevo response: ${JSON.stringify(result)}`);
    
    return result.messageId; // Return the message ID for tracking
  }
}