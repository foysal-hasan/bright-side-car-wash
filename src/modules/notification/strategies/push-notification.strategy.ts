import { Injectable } from '@nestjs/common';
import { NotificationStrategy, NotificationPayload, RegisterStrategy } from '../interfaces/notification-strategy.interface';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationChannel } from 'src/generated/prisma/enums';

@RegisterStrategy()
@Injectable()
export class PushNotificationStrategy implements NotificationStrategy {
  readonly channel = NotificationChannel.PUSH;

  constructor(private readonly gateway: NotificationGateway) {}

  async send(payload: NotificationPayload): Promise<boolean> {
    return this.gateway.send_to_user(payload.recipient, 'live_notification', {
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata,
    });
  }
}