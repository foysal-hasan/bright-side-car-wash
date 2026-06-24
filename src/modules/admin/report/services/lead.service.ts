import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DynamicStageReportDto, SourceBreakdownDto, StageBreakdownDto } from '../dto/lead-converstion-reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) { }


  async getDynamicStageSummary(dto: DynamicStageReportDto) {
    // 1. Establish Current Period Date Boundaries
    const startFilter = dto.startDate ? new Date(dto.startDate) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const endFilter = dto.endDate ? new Date(dto.endDate) : new Date();

    const currentWhere = {
      created_at: { gte: startFilter, lte: endFilter },
      deleted_at: null,
    };

    // 2. Calculate the exact duration to shift backward for the Last Period
    const currentPeriodDurationMs = endFilter.getTime() - startFilter.getTime();

    const lastPeriodStart = new Date(startFilter.getTime() - currentPeriodDurationMs);
    const lastPeriodEnd = new Date(endFilter.getTime() - currentPeriodDurationMs);

    const lastPeriodWhere = {
      created_at: { gte: lastPeriodStart, lte: lastPeriodEnd },
      deleted_at: null,
    };

    // 3. Execute Current Period Queries
    const [totalLeads, stagedLeads] = await Promise.all([
      this.prisma.lead.count({ where: currentWhere }),
      this.prisma.lead.count({
        where: {
          ...currentWhere,
          stage: { name: { equals: dto.stageName, mode: 'insensitive' } },
        },
      }),
    ]);

    const stagedLeadRate = totalLeads > 0
      ? parseFloat(((stagedLeads / totalLeads) * 100).toFixed(1))
      : 0;

    // 4. Execute Last Period Queries
    const [lastTotalLeads, lastStagedLeads] = await Promise.all([
      this.prisma.lead.count({ where: lastPeriodWhere }),
      this.prisma.lead.count({
        where: {
          ...lastPeriodWhere,
          stage: { name: { equals: dto.stageName, mode: 'insensitive' } },
        },
      }),
    ]);

    const lastStagedLeadRate = lastTotalLeads > 0
      ? parseFloat(((lastStagedLeads / lastTotalLeads) * 100).toFixed(1))
      : 0;

    // 5. Calculate Differences/Trends (Matches Dashboard +X% UI)
    const totalLeadsDiffPercentage = lastTotalLeads > 0
      ? parseFloat((((totalLeads - lastTotalLeads) / lastTotalLeads) * 100).toFixed(1))
      : totalLeads > 0 ? 100 : 0;

    const stagedLeadsDiffPercentage = lastStagedLeads > 0
      ? parseFloat((((stagedLeads - lastStagedLeads) / lastStagedLeads) * 100).toFixed(1))
      : stagedLeads > 0 ? 100 : 0;

    // Rates use absolute percentage point differences (e.g., 34.8% - 31.6% = +3.2%)
    const rateDifferencePoints = parseFloat((stagedLeadRate - lastStagedLeadRate).toFixed(1));

    return {
      totalLeads: {
        current: totalLeads,
        lastPeriod: lastTotalLeads,
        percentageChange: totalLeadsDiffPercentage,
      },
      stagedLeads: {
        current: stagedLeads,
        lastPeriod: lastStagedLeads,
        percentageChange: stagedLeadsDiffPercentage,
      },
      stagedLeadRate: {
        current: stagedLeadRate,
        lastPeriod: lastStagedLeadRate,
        pointDifference: rateDifferencePoints,
      }
    };
  }


  async getStageBreakdownByYear(stages: string[]) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all leads created within the last year for the requested stages
    const leads = await this.prisma.lead.findMany({
      where: {
        created_at: { gte: oneYearAgo },
        deleted_at: null,
        stage: { name: { in: stages, mode: 'insensitive' } },
      },
      select: {
        stage: { select: { name: true } },
      },
    });

    // Initialize counter mapping structure dynamically
    const countMap = new Map<string, number>(stages.map(s => [s.toLowerCase(), 0]));

    leads.forEach(lead => {
      const nameKey = lead.stage?.name?.toLowerCase();
      if (nameKey && countMap.has(nameKey)) {
        countMap.set(nameKey, countMap.get(nameKey)! + 1);
      }
    });

    // Format response exactly array pattern requested
    return stages.map(stage => ({
      stageName: stage,
      count: countMap.get(stage.toLowerCase()) || 0,
    }));
  }

  async getLeadSourcesBreakdown(dto: SourceBreakdownDto) {
    // Fallback boundaries if query filters aren't present
    const startFilter = dto.startDate ? new Date(dto.startDate) : new Date(new Date().getFullYear(), 0, 1); // Defaults to Jan 1st
    const endFilter = dto.endDate ? new Date(dto.endDate) : new Date();

    const baseWhere = {
      created_at: { gte: startFilter, lte: endFilter },
      deleted_at: null,
    };

    // Grand total count of resources within this date range
    const totalLeads = await this.prisma.lead.count({ where: baseWhere });

    // Grouping metrics within date range grouped by origin channel source strings
    const sourceGroups = await this.prisma.lead.groupBy({
      by: ['source'],
      where: baseWhere,
      _count: { source: true },
    });

    const eachCount = sourceGroups.map(item => ({
      source: item.source || 'Unknown/Organic',
      count: item._count.source,
    }));

    return {
      totalLeads,
      eachCount,
    };

  }
}