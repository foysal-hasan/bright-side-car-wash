import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CampaignStatus, DeliveryStatus } from 'src/generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly prisma: PrismaService) { }

  // @Post('brevo')
  // @HttpCode(HttpStatus.OK) // Always return a 200 OK immediately to stop retries
  // async handleBrevoWebhook(@Body() payload: any) {
  //   const { event, email, camp_id: providerCampaignId, id: messageId } = payload;

  //   console.log('Received payload:', payload);

  //   if (!email || !providerCampaignId) return { processed: false };

  //   // Locate the matching campaign configuration
  //   const config = await this.prisma.emailConfig.findUnique({
  //     where: { providerCampaignId: providerCampaignId.toString() },
  //   });

  //   if (!config) return { processed: false };

  //   const statusMapping: Record<string, DeliveryStatus> = {
  //     'sent': DeliveryStatus.SENT,
  //     'delivered': DeliveryStatus.DELIVERED,
  //     'opened': DeliveryStatus.OPENED,
  //     'click': DeliveryStatus.CLICKED,
  //     'hard_bounce': DeliveryStatus.BOUNCED,
  //     'soft_bounce': DeliveryStatus.BOUNCED,
  //     'invalid_email': DeliveryStatus.FAILED,
  //   };

  //   const mappedStatus = statusMapping[event];
  //   if (!mappedStatus) return { processed: false };

  //   // Update tracking log using high-performance composite index
  //   await this.prisma.deliveryLog.updateMany({
  //     where: {
  //       campaignId: config.campaignId,
  //       recipient: email,
  //     },
  //     data: {
  //       status: mappedStatus,
  //       providerEventId: messageId?.toString() || null,
  //       metaData: payload,
  //     },
  //   });

  //   return { processed: true };
  // }

  @Post('brevo')
  @HttpCode(HttpStatus.OK) // Always return a 200 OK immediately to stop Brevo retry workers
  async handleBrevoWebhook(@Body() payload: any) {
    // console.log('Received Brevo Event Payload Data:', JSON.stringify(payload));

    // Robust extraction fallback: handles both transactional ('recipient') and standard marketing ('email') paths
    const email = payload.email || payload.recipient;
    const providerCampaignId = payload.camp_id || payload['message-id'];
    const event = payload.event;
    const messageId = payload.id || payload['message-id'];

    if (!email || !providerCampaignId) {
      console.warn('Webhook processing skipped: Missing unique identifier keys.', { email, providerCampaignId });
      return { processed: false, reason: 'Missing keys' };
    }

    // 1. Locate the matching campaign configuration using safe string casting
    const config = await this.prisma.emailConfig.findUnique({
      where: { providerCampaignId: providerCampaignId.toString() },
    });

    if (!config) {
      console.warn(`No local configuration profile found matching Brevo ID: ${providerCampaignId}`);
      return { processed: false, reason: 'Campaign configuration context missing' };
    }

    // 2. Normalize and translate outbound webhook events to database schema definitions
    const statusMapping: Record<string, DeliveryStatus> = {
      'sent': DeliveryStatus.SENT,
      'delivered': DeliveryStatus.DELIVERED,
      'opened': DeliveryStatus.OPENED,
      'click': DeliveryStatus.CLICKED,
      'hard_bounce': DeliveryStatus.BOUNCED,
      'soft_bounce': DeliveryStatus.BOUNCED,
      'invalid_email': DeliveryStatus.FAILED,
      'blocked': DeliveryStatus.FAILED,
      'unsubscribed': DeliveryStatus.FAILED,
    };

    const mappedStatus = statusMapping[event];
    if (!mappedStatus) {
      return { processed: false, reason: `Event trace type "${event}" unmapped inside engine rules.` };
    }

    // 3. Bulk update tracking log utilizing your composite schema index strategy @@index([campaignId, recipient])
    const updateResult = await this.prisma.deliveryLog.updateMany({
      where: {
        campaignId: config.campaignId,
        recipient: email,
      },
      data: {
        status: mappedStatus,
        providerEventId: messageId?.toString() || null,
        metaData: payload as any, // Persists full event telemetry payload logs
      },
    });

    // 4. Trigger Campaign Status Assessment
    const totalPending = await this.prisma.deliveryLog.count({
      where: {
        campaignId: config.campaignId,
        status: DeliveryStatus.PENDING,
      },
    });

    // If no records are PENDING, the campaign is complete
    if (totalPending === 0) {
      // Check if all delivery logs failed or bounced to mark as FAILED
      const failureCount = await this.prisma.deliveryLog.count({
        where: {
          campaignId: config.campaignId,
          status: { in: [DeliveryStatus.FAILED, DeliveryStatus.BOUNCED] },
        },
      });

      const totalLogs = await this.prisma.deliveryLog.count({
        where: { campaignId: config.campaignId }
      });

      const finalStatus = (failureCount === totalLogs && totalLogs > 0)
        ? CampaignStatus.FAILED
        : CampaignStatus.COMPLETED;

      await this.prisma.campaign.update({
        where: { id: config.campaignId },
        data: { status: finalStatus },
      });

      // console.log(`Campaign ${config.campaignId} status marked as: ${finalStatus}`);
    }

    return {
      processed: true,
      matchedRecords: updateResult.count
    };
  }
}