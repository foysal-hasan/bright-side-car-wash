// src/campaign/controllers/webhook.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DeliveryStatus } from 'src/generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('brevo')
  @HttpCode(HttpStatus.OK) // Always return a 200 OK immediately to stop retries
  async handleBrevoWebhook(@Body() payload: any) {
    const { event, email, camp_id: providerCampaignId, id: messageId } = payload;

    console.log('Received payload:', payload);

    if (!email || !providerCampaignId) return { processed: false };

    // Locate the matching campaign configuration
    const config = await this.prisma.emailConfig.findUnique({
      where: { providerCampaignId: providerCampaignId.toString() },
    });

    if (!config) return { processed: false };

    const statusMapping: Record<string, DeliveryStatus> = {
      'sent': DeliveryStatus.SENT,
      'delivered': DeliveryStatus.DELIVERED,
      'opened': DeliveryStatus.OPENED,
      'click': DeliveryStatus.CLICKED,
      'hard_bounce': DeliveryStatus.BOUNCED,
      'soft_bounce': DeliveryStatus.BOUNCED,
      'invalid_email': DeliveryStatus.FAILED,
    };

    const mappedStatus = statusMapping[event];
    if (!mappedStatus) return { processed: false };

    // Update tracking log using high-performance composite index
    await this.prisma.deliveryLog.updateMany({
      where: {
        campaignId: config.campaignId,
        recipient: email,
      },
      data: {
        status: mappedStatus,
        providerEventId: messageId?.toString() || null,
        metaData: payload,
      },
    });

    return { processed: true };
  }
}