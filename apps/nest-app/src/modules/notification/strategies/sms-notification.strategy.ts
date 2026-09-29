import { Injectable, Logger } from '@nestjs/common';
import { NotificationStrategy, NotificationPayload, RegisterStrategy } from '../interfaces/notification-strategy.interface';
import { NotificationChannel } from 'src/generated/prisma/enums';

@RegisterStrategy() 
@Injectable()
export class SmsNotificationStrategy implements NotificationStrategy {
  private readonly logger = new Logger(SmsNotificationStrategy.name);
  readonly channel = NotificationChannel.SMS;

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(`[SMS Dispatched] Text payload pushed to: ${payload.recipient}`);
    // Replace with third-party driver: e.g., await this.twilioClient.messages.create(...)
    return true;
  }
}