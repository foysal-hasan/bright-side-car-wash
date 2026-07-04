import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DepositRevenueQueryDto } from '../dto/deposit.revenue.query.dto';
import { PaymentStatus } from 'src/generated/prisma/enums';


@Injectable()
export class DepositAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepositRevenueStats(query: DepositRevenueQueryDto) {
    const currentEnd = query.endDate ? new Date(query.endDate) : new Date();
    const currentStart = query.startDate 
      ? new Date(query.startDate) 
      : new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (currentStart > currentEnd) {
      throw new BadRequestException('Start date cannot be after the end date.');
    }

    const timeDifferenceMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1); 
    const previousStart = new Date(previousEnd.getTime() - timeDifferenceMs);

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          created_at: { gte: currentStart, lte: currentEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          created_at: { gte: previousStart, lte: previousEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const currentRevenue = Number(currentMetrics._sum?.amount ?? 0);
    const currentCount = currentMetrics._count?.id ?? 0;
    const previousRevenue = Number(previousMetrics._sum?.amount ?? 0);
    const previousCount = previousMetrics._count?.id ?? 0;

    // Helper to securely calculate averages and prevent 0 division bugs
    const currentAverage = currentCount > 0 ? Number((currentRevenue / currentCount).toFixed(2)) : 0;
    const previousAverage = previousCount > 0 ? Number((previousRevenue / previousCount).toFixed(2)) : 0;

    const calculateVariance = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // --- [12 Month Chart Processing Logic] ---
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: Record<string, { month: string; fullLabel: string; revenue: number }> = {};
    const referenceDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
      const shortMonth = monthNames[d.getMonth()];
      const fullLabel = `${shortMonth} ${d.getFullYear()}`;
      monthlyMap[fullLabel] = { month: shortMonth, fullLabel, revenue: 0 };
    }

    const chartWindowStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1);
    const historicalPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        created_at: { gte: chartWindowStart },
      },
      select: { amount: true, created_at: true },
    });

    historicalPayments.forEach((payment) => {
      const date = new Date(payment.created_at);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (monthlyMap[label]) {
        monthlyMap[label].revenue += Number(payment.amount);
      }
    });

    return {
      totalDepositRevenue: {
        current: currentRevenue,
        lastPeriod: previousRevenue,
        percentageChange: calculateVariance(currentRevenue, previousRevenue),
      },
      paidDepositsCount: {
        current: currentCount,
        lastPeriod: previousCount,
        percentageChange: calculateVariance(currentCount, previousCount),
      },
      averageDepositValue: {
        current: currentAverage,
        lastPeriod: previousAverage,
        percentageChange: calculateVariance(currentAverage, previousAverage),
      },
      chartData: Object.values(monthlyMap),
    };
  }
}