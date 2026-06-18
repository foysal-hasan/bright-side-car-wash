import { CampaignResult, CreateCampaignPayload } from "../types/email.types";

export interface IEmailProvider {
  sendTransactional(to: string, subject: string, html: string): Promise<boolean>;
  createCampaign(payload: CreateCampaignPayload): Promise<CampaignResult>;
  sendCampaign(providerCampaignId: string): Promise<boolean>;
  getCampaignReport(providerCampaignId: string): Promise<any>;
}