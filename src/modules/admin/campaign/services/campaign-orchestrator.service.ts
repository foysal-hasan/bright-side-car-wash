// src/campaign/services/campaign-orchestrator.service.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BrevoProvider } from '../providers/brevo.provider';
import { CampaignStatus, ChannelType, DeliveryStatus } from 'src/generated/prisma/enums';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../constants';


@Injectable()
export class CampaignOrchestratorService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(EMAIL_PROVIDER_TOKEN) private readonly brevoProvider: IEmailProvider,
    ) { }

    async createCampaign(data: {
        name: string;
        subject: string;
        htmlContent: string;
        senderName: string;
        senderEmail: string;
        leadGroupId: string;
        scheduledAt?: Date;
    }) {
        return this.prisma.campaign.create({
            data: {
                name: data.name,
                channelType: ChannelType.EMAIL,
                scheduledAt: data.scheduledAt,
                emailConfig: {
                    create: {
                        subject: data.subject,
                        htmlContent: data.htmlContent,
                        senderName: data.senderName,
                        senderEmail: data.senderEmail,
                        leadGroupId: data.leadGroupId,
                    },
                },
            },
        });
    }


    async finalizeAndLaunch(campaignId: string) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { emailConfig: { include: { leadGroup: true } } },
        });

        if (!campaign || !campaign.emailConfig || !campaign.emailConfig.leadGroup.brevoListId) {
            throw new NotFoundException('Campaign profile configurations are incomplete.');
        }

        const { brevoListId } = campaign.emailConfig.leadGroup;

        // 1. Directly provision the campaign shell inside Brevo targeting our pre-warmed list ID
        const providerCampaignId = await this.brevoProvider.createMarketingCampaign({
            name: campaign.name,
            subject: campaign.emailConfig.subject,
            htmlContent: campaign.emailConfig.htmlContent,
            senderName: campaign.emailConfig.senderName,
            senderEmail: campaign.emailConfig.senderEmail,
            brevoListId: brevoListId,
            scheduledAt: campaign.scheduledAt || undefined,
        });

        // 2. Save the provider campaign tracking reference
        await this.prisma.emailConfig.update({
            where: { campaignId },
            data: { providerCampaignId },
        });

        // 3. Command execution routing
        await this.brevoProvider.launchCampaign(providerCampaignId, campaign.scheduledAt || undefined);

        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: campaign.scheduledAt ? 'SCHEDULED' : 'SENDING' },
        });

        return { success: true, providerCampaignId };
    }

    async getCampaignAnalytics(campaignId: string) {
        const summary = await this.prisma.deliveryLog.groupBy({
            by: ['status'],
            where: { campaignId },
            _count: { status: true },
        });

        return summary.reduce((acc, current) => {
            acc[current.status] = current._count.status;
            return acc;
        }, {} as Record<string, number>);
    }
}