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