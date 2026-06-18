import { BrevoClient } from '@getbrevo/brevo'; 
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { CampaignResult, CreateCampaignPayload } from '../types/email.types';
import appConfig from 'src/config/app.config';

export class BrevoProvider implements IEmailProvider {
  private client: any;

  constructor() {
    // Initialize Brevo client using your API key
    this.client = new BrevoClient({ apiKey: appConfig().campaign.brevo.apiKey });
  }

  async sendTransactional(to: string, subject: string, html: string): Promise<boolean> {
    // Map data to Brevo's transactional format
    await this.client.transactionalEmails.sendTransacEmail({
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    return true;
  }

  async createCampaign(payload: CreateCampaignPayload): Promise<CampaignResult> {
    // Map your custom dashboard structural format to Brevo's format
    const response = await this.client.emailCampaigns.createEmailCampaign({
      name: payload.name,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      sender: payload.sender,
    //   recipients: { listIds: payload.recipients.listIds }
    });

    return {
      providerCampaignId: response.id.toString(),
      status: 'draft',
    };
  }

  async sendCampaign(providerCampaignId: string): Promise<boolean> {
    await this.client.emailCampaigns.sendEmailCampaignNow(Number(providerCampaignId));
    return true;
  }

  async getCampaignReport(providerCampaignId: string): Promise<any> {
    return await this.client.emailCampaigns.getEmailCampaign(Number(providerCampaignId));
  }
}