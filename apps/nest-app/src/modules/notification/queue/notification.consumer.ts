import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from '../notification.service';
import { NotificationPayload } from '../interfaces/notification-strategy.interface';
import { NotificationChannel } from 'src/generated/prisma/browser';

@Processor('notification_queue')
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  @OnWorkerEvent('active')
  on_active(job: Job) {
    this.logger.log(`Processing notification job ${job.id} of type ${job.name}...`);
  }

  @OnWorkerEvent('completed')
  on_completed(job: Job) {
    this.logger.log(`Notification job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  on_failed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);
  }

  // BullMQ runs this single method for all incoming jobs in this queue
  async process(job: Job<{ channel: NotificationChannel; payload: NotificationPayload }>): Promise<any> {
    this.logger.log(`Handling job ${job.id} with name ${job.name}`);

    try {
      switch (job.name) {
        case 'send_dispatch_job': {
          const { channel, payload } = job.data;
          await this.notificationService.process_background_job(channel, payload);
          break;
        }

        default:
          this.logger.warn(`Unknown job name observed: ${job.name}`);
          return;
      }
    } catch (error) {
      this.logger.error(`Error executing job ${job.id} (${job.name})`, error);
      throw error; // Crucial for BullMQ to handle retries and backoffs properly
    }
  }
}