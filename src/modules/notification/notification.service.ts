import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { NotificationStrategy, NotificationPayload, NOTIFICATION_STRATEGY_TOKEN } from './interfaces/notification-strategy.interface';
import { NotificationChannel, NotificationStatus } from 'src/generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly registry = new Map<NotificationChannel, NotificationStrategy>();

  constructor(
    @Inject(NOTIFICATION_STRATEGY_TOKEN) private readonly strategies: NotificationStrategy[],
    private readonly prisma: PrismaService,
  ) {
    // Automatically maps whatever strategies are passed in by NestJS
    for (const strategy of this.strategies) {
      this.registry.set(strategy.channel, strategy);
      this.logger.log(`Strategy registered automatically for channel: ${strategy.channel}`);
    }
  }

  async process_background_job(channel: NotificationChannel, payload: NotificationPayload): Promise<boolean> {
    const strategy = this.registry.get(channel);
    if (!strategy) throw new BadRequestException(`Channel '${channel}' is unsupported.`);

    const log_record = await this.prisma.notificationLog.create({
      data: {
        recipient: payload.recipient,
        title: payload.title,
        body: payload.body,
        channel,
        metadata: payload.metadata || null,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      const success = await strategy.send(payload);

      await this.prisma.notificationLog.update({
        where: { id: log_record.id },
        data: { status: success ? NotificationStatus.SUCCESS : NotificationStatus.FAILED },
      });

      return success;
    } catch (error) {
      await this.prisma.notificationLog.update({
        where: { id: log_record.id },
        data: { status: NotificationStatus.FAILED, error_logs: error.message },
      });
      throw error;
    }
  }

  async get_audit_logs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.notificationLog.count(),
    ]);
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }
}