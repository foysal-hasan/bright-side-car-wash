// src/campaign/services/campaign-orchestrator.service.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BrevoProvider } from '../providers/brevo.provider';
import { CampaignStatus, ChannelType, DeliveryStatus } from 'src/generated/prisma/enums';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../constants';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignPaginationQueryDto } from '../dto/campaign-pagination-query.dto';
import { Prisma } from 'src/generated/prisma/browser';
import { CampaignAction } from '../dto/campaign-status-action.dto';


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


    async findAll(query: CampaignPaginationQueryDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search?.trim();

        const whereClause: Prisma.CampaignWhereInput = {
            ...(query.status && { status: query.status }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
        };

        const [totalItems, data] = await this.prisma.$transaction([
            this.prisma.campaign.count({ where: whereClause }),
            this.prisma.campaign.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    emailConfig: {
                        select: {
                            subject: true,
                            senderEmail: true,
                            leadGroup: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data,
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    async findOne(id: string) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: {
                emailConfig: {
                    include: {
                        leadGroup: {
                            select: { id: true, name: true, brevoListId: true },
                        },
                    },
                },
            },
        });

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID "${id}" could not be found.`);
        }

        return campaign;
    }

    async update(id: string, dto: UpdateCampaignDto) {
        const campaign = await this.findOne(id);

        // Guard Clause: Block mutations if the campaign is already deploying or finished
        if (campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.COMPLETED) {
            throw new BadRequestException(
                `Modification rejected. Campaign is already locked at status: ${campaign.status}`
            );
        }

        const data = {
            // Update parent table attributes if provided
            ...(dto.name && { name: dto.name }),
            ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }),

            // Update nested relation table configuration values dynamically
            emailConfig: {
                update: {
                    ...(dto.subject && { subject: dto.subject }),
                    ...(dto.htmlContent && { htmlContent: dto.htmlContent }),
                    ...(dto.senderName && { senderName: dto.senderName }),
                    ...(dto.senderEmail && { senderEmail: dto.senderEmail }),
                    ...(dto.leadGroupId && { leadGroupId: dto.leadGroupId }),
                },
            },
        }

        const updateMarketingCampaign = {
            ...(dto.name && { name: dto.name }),
            ...(dto.subject && { subject: dto.subject }),
            ...(dto.htmlContent && { htmlContent: dto.htmlContent }),
            ...(dto.senderName && { senderName: dto.senderName }),
            ...(dto.senderEmail && { senderEmail: dto.senderEmail }),
            ...(dto.leadGroupId && { brevoListId: campaign.emailConfig?.leadGroup.brevoListId }),
            ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined }),
        }


        // schedule also need to update the provider campaign if it was already launched with a schedule
        if (dto.scheduledAt !== undefined && campaign.emailConfig?.providerCampaignId) {
            await this.brevoProvider.updateMarketingCampaign(campaign.emailConfig.providerCampaignId, updateMarketingCampaign);
        }

        return this.prisma.campaign.update({
            where: { id },
            data: data,
            include: {
                emailConfig: true,
            },
        });
    }

    async changeCampaignStatus(id: string, action: CampaignAction) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: { emailConfig: true },
        });

        if (!campaign) throw new NotFoundException('Campaign not found.');

        const providerId = campaign.emailConfig?.providerCampaignId;
        if (!providerId) {
            throw new BadRequestException('This campaign has not been launched or initialized in Brevo yet.');
        }

        // ==================== SUSPEND ACTION ====================
        if (action === CampaignAction.SUSPEND) {
            if (campaign.status !== CampaignStatus.SCHEDULED) {
                throw new BadRequestException('Only future-scheduled campaigns can be suspended.');
            }

            // Tell Brevo to stop deployment checks
            await this.brevoProvider.updateRemoteCampaignStatus(providerId, 'suspended');

            // Update local state to DRAFT or create a custom SUSPENDED status if desired
            return this.prisma.campaign.update({
                where: { id },
                data: { status: CampaignStatus.DRAFT },
            });
        }

        // ==================== RESTART ACTION ====================
        if (action === CampaignAction.RESTART) {
            if (campaign.status !== CampaignStatus.SUSPENDED || !campaign.scheduledAt) {
                throw new BadRequestException('Campaign must be a suspended draft with a scheduled time to restart.');
            }

            if (new Date(campaign.scheduledAt) <= new Date()) {
                throw new BadRequestException('The scheduled date has passed. Please update the scheduled date first.');
            }

            // Tell Brevo to put it back into the active queue
            await this.brevoProvider.updateRemoteCampaignStatus(providerId, 'queued');

            return this.prisma.campaign.update({
                where: { id },
                data: { status: CampaignStatus.SCHEDULED },
            });
        }
    }

    async remove(id: string) {
        const campaign = await this.findOne(id);

        if (campaign.status === CampaignStatus.SENDING) {
            throw new BadRequestException('Cannot delete a live campaign mid-flight.');
        }

        // Relying on Prisma's onDelete: Cascade schema strategy to drop emailConfig automatically
        await this.prisma.campaign.delete({
            where: { id },
        });

        return null;
    }
}