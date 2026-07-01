import { Injectable, Logger } from '@nestjs/common';
import { NotificationStrategy, NotificationPayload, RegisterStrategy } from '../interfaces/notification-strategy.interface';
import { NotificationChannel } from 'src/generated/prisma/browser';
import { NotificationGateway } from '../gateway/notification.gateway';

@RegisterStrategy() // Tagged for automatic discovery
@Injectable()
export class WebsocketNotificationStrategy implements NotificationStrategy {
  private readonly logger = new Logger(WebsocketNotificationStrategy.name);
  readonly channel = NotificationChannel.IN_APP;

  constructor(private readonly gateway: NotificationGateway) {}

  async send(payload: NotificationPayload): Promise<boolean> {
    const user_id = payload.recipient;
    this.logger.log(`Routing in-app real-time socket packet to user: ${user_id}`);

    // Pushes directly down the user's open WebSocket pipe
    return this.gateway.send_to_user(user_id, 'new_in_app_notification', {
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata,
      created_at: new Date(),
    });
  }
}