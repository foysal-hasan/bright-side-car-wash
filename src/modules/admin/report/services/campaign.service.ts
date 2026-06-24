import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignHighlightsQueryDto, CampaignReportTableQueryDto } from '../dto/campaign-reports.dto';

@Injectable()
export class CampaignReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async getTopPerformanceCards(dto: CampaignHighlightsQueryDto) {
        try {
            // Default to January 1st of the current year if no startDate is provided
            const startFilter = dto.startDate ? new Date(dto.startDate) : new Date(new Date().getFullYear(), 0, 1);
            const endFilter = dto.endDate ? new Date(dto.endDate) : new Date();

            const topCampaigns = await this.prisma.campaign.findMany({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startFilter, lte: endFilter }
                },
                orderBy: { createdAt: 'desc' },
                take: 4, // Populates the top 4 visual horizontal cards in the dashboard UI
                include: {
                    _count: {
                        select: { deliveryLogs: true }
                    },
                    deliveryLogs: {
                        select: { status: true }
                    }
                }
            });

            return topCampaigns.map(campaign => {
                const totalSent = campaign._count.deliveryLogs;

                // Count logs marked as OPENED or CLICKED to derive true email open activity
                const totalOpened = campaign.deliveryLogs.filter(log =>
                    ['OPENED', 'CLICKED'].includes(log.status)
                ).length;

                const totalClicked = campaign.deliveryLogs.filter(log => log.status === 'CLICKED').length;

                return {
                    id: campaign.id,
                    name: campaign.name,
                    openRate: totalSent > 0 ? parseFloat(((totalOpened / totalSent) * 100).toFixed(0)) : 0,
                    clickRate: totalSent > 0 ? parseFloat(((totalClicked / totalSent) * 100).toFixed(0)) : 0,
                };
            });
        } catch (error) {
            throw new BadRequestException('Failed to calculate campaign highlight analytics metrics.');
        }
    }


    async getCampaignReportTable(query: CampaignReportTableQueryDto) {
        try {
            const { page, limit, search, startDate, endDate } = query;
            const skip = (page - 1) * limit;

            const startFilter = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
            const endFilter = endDate ? new Date(endDate) : new Date();

            // Combine sorting rules, search string tokens, and date window ranges
            const whereCondition: any = {
                status: 'COMPLETED',
                createdAt: { gte: startFilter, lte: endFilter },
                ...(search && { name: { contains: search, mode: 'insensitive' } })
            };

            // Run parallel query executions to optimize database processing times
            const [totalItems, campaigns] = await Promise.all([
                this.prisma.campaign.count({ where: whereCondition }),
                this.prisma.campaign.findMany({
                    where: whereCondition,
                    skip,
                    take: limit, // Uses dynamic configurations passed from your request
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { deliveryLogs: true }
                        },
                        deliveryLogs: {
                            select: { status: true }
                        }
                    }
                })
            ]);

            const dataRows = campaigns.map((campaign, index) => {
                const totalSent = campaign._count.deliveryLogs;
                const totalOpened = campaign.deliveryLogs.filter(log =>
                    ['OPENED', 'CLICKED'].includes(log.status)
                ).length;
                const totalClicked = campaign.deliveryLogs.filter(log => log.status === 'CLICKED').length;

                return {
                    rowNumber: skip + index + 1, // Dynamically calculates structural placement order indices
                    id: campaign.id,
                    campaignName: campaign.name,
                    sent: totalSent,
                    openRate: totalSent > 0 ? parseFloat(((totalOpened / totalSent) * 100).toFixed(0)) : 0,
                    clickRate: totalSent > 0 ? parseFloat(((totalClicked / totalSent) * 100).toFixed(0)) : 0,
                };
            });

            return {
                data: dataRows,
                meta: {
                    totalItems,
                    itemCount: dataRows.length,
                    itemsPerPage: limit,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    hasNextPage: page * limit < totalItems,
                    hasPreviousPage: page > 1,
                }
            };
        } catch (error) {
            throw new BadRequestException('Failed to compile report data rows matrix records.');
        }
    }
}