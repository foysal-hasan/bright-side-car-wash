export interface CreateCampaignPayload {
  name: string;
  subject: string;
  htmlContent: string;
  sender: { name: string; email: string };
  recipients: { listIds?: number[]; segmentIds?: number[] };
}

export interface CampaignResult {
  providerCampaignId: string;
  status: 'queued' | 'sent' | 'draft';
}

export interface EmailOptions {
  from: { email: string; name?: string };
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: string[];
  params?: { [key: string]: unknown };
} 