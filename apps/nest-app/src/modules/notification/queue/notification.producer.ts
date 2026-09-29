import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationPayload } from '../interfaces/notification-strategy.interface';
import { NotificationChannel } from 'src/generated/prisma/enums';

@Injectable()
export class NotificationProducer {
  constructor(@InjectQueue('notification_queue') private readonly queue: Queue) {}

  /**
   * Universal invocation trigger accessible anywhere within the app
   */
  async trigger(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    await this.queue.add(
      'send_dispatch_job',
      { channel, payload },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }
}