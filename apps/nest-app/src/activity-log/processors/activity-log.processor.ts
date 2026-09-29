import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';



@Processor('activity-logs-queue')
@Injectable()
export class ActivityLogProcessor extends WorkerHost implements OnModuleDestroy {
  private logBuffer: any[] = [];
  private readonly BATCH_SIZE = 50; // Flush after 50 items
  private readonly FLUSH_INTERVAL = 5000; // Or every 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.startFlushTimer();
  }

  async process(job: Job<any>): Promise<void> {
    this.logBuffer.push(job.data);

    if (this.logBuffer.length >= this.BATCH_SIZE) {
      await this.flushLogs();
    }
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    // Snapshot the buffer and clear it immediately to prevent race conditions
    const batchToInsert = [...this.logBuffer];
    this.logBuffer = [];

    // Reset timer
    this.resetFlushTimer();

    try {
      // Prisma createMany handles array insertion extremely efficiently
      await this.prisma.activityLog.createMany({
        data: batchToInsert,
        skipDuplicates: true, // Safeguard
      });
    } catch (error) {
      console.error('Failed to batch insert activity logs to Database:', error);
      // Optional: Push back to a dead-letter queue or log file so you don't lose them
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      await this.flushLogs();
    }, this.FLUSH_INTERVAL);
  }

  private resetFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.startFlushTimer();
    }
  }

  // Lifecycle hook: Make sure remaining buffered logs are flushed if app crashes/restarts
  async onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushLogs();
  }
}