import { BrevoClient } from '@getbrevo/brevo';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { CampaignResult, CreateCampaignPayload } from '../types/email.types';
import appConfig from 'src/config/app.config';

export class BrevoProvider implements IEmailProvider {
  private client: any;
  private cachedFolderId: number | null = null;

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

  /**
   * Internal helper to find or create the single master folder
   */
  private async getOrCreateMasterFolder(): Promise<number> {
    if (this.cachedFolderId) return this.cachedFolderId;

    const targetFolderName = 'Dashboard Campaigns Folder';
    try {
      const foldersList = await this.client.contacts.getFolders({ limit: 50, offset: 0 });
      const existingFolder = foldersList.folders?.find(
        (f: any) => f.name.toLowerCase() === targetFolderName.toLowerCase()
      );

      if (existingFolder) {
        this.cachedFolderId = existingFolder.id;
        return existingFolder.id;
      }
      const newFolder = await this.client.contacts.createFolder({ name: targetFolderName });

      this.cachedFolderId = newFolder.id;
      return newFolder.id;
    } catch (err) {
      console.error('Failed to resolve master folder, defaulting to ID 1:', err);
      return 1;
    }
  }

  /**
   * Syncs emails to a reusable list. Creates it if missing, syncs contacts if it exists.
   */
  async createContactList(listName: string, emails: string[], existingBrevoListId?: number | null): Promise<number> {
    let brevoListId = existingBrevoListId;

    // 1. Create the list if it doesn't exist yet
    if (!brevoListId) {
      const folderId = await this.getOrCreateMasterFolder();
      const listResponse = await this.client.contacts.createList({
        name: listName,
        folderId: Number(folderId),
      });
      brevoListId = listResponse.id;
    } else {
      // 2. Clear out any existing contacts in the list to make it clean for reuse
      try {
        // Fetch contacts currently in the list
        const currentContacts = await this.client.contacts.getContactsFromList({
          listId: brevoListId,
          limit: 100,
        });

        const contactsToEmpty = currentContacts.contacts?.map((c: any) => c.email) || [];
        if (contactsToEmpty.length > 0) {
          await this.client.contacts.removeContactFromList(brevoListId, {
            body: {
              all: true,
            },
          });
        }
      } catch (err) {
        console.warn(`Could not clear old contacts from Brevo list ${brevoListId}, moving to sync step.`, err);
      }
    }

    // 3. Batch insert/update the new active emails into this list
    for (const email of emails) {
      try {
        await this.client.contacts.createContact({
          email,
          listIds: [Number(brevoListId)],
          updateEnabled: true,
        });
      } catch (err) {
        // Ignore single malformed rows to prevent crashing the whole pipeline
      }
    }

    return Number(brevoListId);
  }



  // async createContactList(listName: string, emails: string[]): Promise<number> {
  //   // Note: Brevo requires a structural Folder ID to store lists. 
  //   // Ensure folder ID '1' exists or replace it with your Brevo folder ID.
  //   const folderResponse = await this.client.contacts.createFolder({ name: `Campaign Lists`, parentId: 0 });

  //   const listResponse = await this.client.contacts.createList({
  //     name: listName,
  //     folderId: folderResponse.id,
  //   });

  //   const brevoListId = listResponse.id;

  //   // Batch upload the target group profiles
  //   for (const email of emails) {
  //     try {
  //       await this.client.contacts.createContact({
  //         email,
  //         listIds: [brevoListId],
  //         updateEnabled: true,
  //       });
  //     } catch (err) {
  //       // Suppresses errors if an isolated row fails basic field parsing
  //     }
  //   }
  //   return brevoListId;
  // }

  async createMarketingCampaign(payload: {
    name: string;
    subject: string;
    htmlContent: string;
    senderName: string;
    senderEmail: string;
    brevoListId: number;
    scheduledAt?: Date;
  }): Promise<string> {
    const campaignConfig: any = {
      name: payload.name,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      sender: { name: payload.senderName, email: payload.senderEmail },
      recipients: { listIds: [payload.brevoListId] },
    };

    if (payload.scheduledAt) {
      campaignConfig.scheduledAt = payload.scheduledAt.toISOString();
    }

    const response = await this.client.emailCampaigns.createEmailCampaign(campaignConfig);
    return response.id.toString();
  }

  async launchCampaign(providerCampaignId: string, scheduledAt?: Date): Promise<boolean> {
      if (!scheduledAt) {
        await this.client.emailCampaigns.sendEmailCampaignNow({ campaignId: Number(providerCampaignId) });
      }
      return true;
  }


  // Create a clean list shell in Brevo
  async createRemoteList(name: string): Promise<number> {
    console.log(`Creating remote list in Brevo with name: ${name} and folder ID: ${await this.getOrCreateMasterFolder()}`);
    const response = await this.client.contacts.createList({ name, folderId: await this.getOrCreateMasterFolder() });
    return response.id;
  }

  // Add a single contact or batch of contacts to a list
  async addContactsToList(brevoListId: number, emails: string[]): Promise<void> {
    for (const email of emails) {
      try {
        await this.client.contacts.createContact({
          email,
          listIds: [brevoListId],
          updateEnabled: true,
        });
      } catch (err) {
        // Suppress individual errors (e.g., if email is malformed)
      }
    }
  }

  // Remove a batch of contacts from a specific list
  async removeContactsFromList(brevoListId: number, emails: string[]): Promise<void> {
    await fetch(`https://api.brevo.com/v3/contacts/lists/${brevoListId}/contacts/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': appConfig().campaign.brevo.apiKey || '',
      },
      body: JSON.stringify({ emails }),
    });
  }

  // Delete the entire list from Brevo
  async deleteRemoteList(brevoListId: number): Promise<void> {
    try {
      await this.client.contacts.deleteList({ listId: brevoListId });
    } catch (err) {
      console.error(`Failed to delete Brevo list ${brevoListId}:`, err);
    }
  }
}