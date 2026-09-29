import { Injectable, Logger } from '@nestjs/common';
import { NotificationStrategy, NotificationPayload, RegisterStrategy } from '../interfaces/notification-strategy.interface';
import { NotificationChannel } from 'src/generated/prisma/browser';


@RegisterStrategy() 
@Injectable()
export class EmailNotificationStrategy implements NotificationStrategy {
  private readonly logger = new Logger(EmailNotificationStrategy.name);
  readonly channel = NotificationChannel.EMAIL;

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(`[Email Dispatched] Message processed for: ${payload.recipient}`);
    // Replace with third-party driver: e.g., await this.mailerService.send(...)
    return true;
  }
}