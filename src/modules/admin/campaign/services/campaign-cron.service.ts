import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignStatus, DeliveryStatus } from 'src/generated/prisma/browser';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../constants';

@Injectable()
export class CampaignCronService {
  private readonly logger = new Logger(CampaignCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: IEmailProvider,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleStuckCampaigns() {
    this.logger.log('Starting CRON job to check for stuck campaigns...');

    const runningCampaigns = await this.prisma.campaign.findMany({
      where: { status: CampaignStatus.RUNNING },
      include: { emailConfig: true },
    });

    if (runningCampaigns.length === 0) {
      this.logger.log('No RUNNING campaigns found.');
      return;
    }

    for (const campaign of runningCampaigns) {
      const providerId = campaign.emailConfig?.providerCampaignId;
      if (!providerId || providerId === 'undefined') {
        this.logger.warn(`Campaign ${campaign.id} is missing a valid providerCampaignId (found: ${providerId}). Skipping...`);
        continue;
      }

      try {
        const report = await this.emailProvider.getCampaignReport(providerId);
        
        // Check if Brevo considers the campaign as sent, suspended, or archived
        if (['sent', 'suspended', 'archive'].includes(report.status)) {
          this.logger.log(`Campaign ${campaign.id} is marked as ${report.status} in Brevo but RUNNING locally. Evaluating pending logs...`);

          const totalPending = await this.prisma.deliveryLog.count({
            where: { campaignId: campaign.id, status: DeliveryStatus.PENDING },
          });

          // If there are still pending logs but the campaign is done in Brevo, mark them as FAILED
          if (totalPending > 0) {
            await this.prisma.deliveryLog.updateMany({
              where: { campaignId: campaign.id, status: DeliveryStatus.PENDING },
              data: { status: DeliveryStatus.FAILED },
            });
            this.logger.log(`Marked ${totalPending} orphaned PENDING logs as FAILED for campaign ${campaign.id}`);
          }

          // Evaluate the final status of the campaign using the same logic as the webhook
          const failureCount = await this.prisma.deliveryLog.count({
            where: {
              campaignId: campaign.id,
              status: { in: [DeliveryStatus.FAILED, DeliveryStatus.BOUNCED] },
            },
          });

          const totalLogs = await this.prisma.deliveryLog.count({
            where: { campaignId: campaign.id }
          });

          const finalStatus = (failureCount === totalLogs && totalLogs > 0)
            ? CampaignStatus.FAILED
            : CampaignStatus.COMPLETED;

          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: finalStatus },
          });

          this.logger.log(`Successfully updated stuck campaign ${campaign.id} to status ${finalStatus}`);
        }
      } catch (error) {
        this.logger.error(`Error checking stuck campaign ${campaign.id}:`, error);
      }
    }
  }
}
