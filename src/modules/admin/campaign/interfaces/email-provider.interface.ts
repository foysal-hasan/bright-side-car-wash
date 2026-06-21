import { CampaignResult, CreateCampaignPayload } from "../types/email.types";

export interface IEmailProvider {
  sendTransactional(to: string, subject: string, html: string): Promise<boolean>;
  createCampaign(payload: CreateCampaignPayload): Promise<CampaignResult>;
  sendCampaign(providerCampaignId: string): Promise<boolean>;
  getCampaignReport(providerCampaignId: string): Promise<any>;
  // createContactList(listName: string, emails: string[]): Promise<number>;
  createContactList(listName: string, emails: string[], existingListId?: number | null): Promise<number>;
  createMarketingCampaign(payload: { name: string;
    subject: string;
    htmlContent: string;
    senderName: string;
    senderEmail: string;
    brevoListId: number;
    scheduledAt?: Date;}): Promise<string>;

  launchCampaign(providerCampaignId: string, scheduledAt?: Date): Promise<boolean>;

  createRemoteList(listName: string): Promise<number>;
  addContactsToList(brevoListId: number, emails: string[]): Promise<void>;
  removeContactsFromList(brevoListId: number, emails: string[]): Promise<void>;
  deleteRemoteList(brevoListId: number): Promise<void>;
}