import { Module, Global, Provider } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationProducer } from './queue/notification.producer';
import { NotificationConsumer } from './queue/notification.consumer';
import { NotificationGateway } from './gateway/notification.gateway';
import { AdminNotificationController } from './admin-notification.controller';
import { NOTIFICATION_STRATEGY_TOKEN } from './interfaces/notification-strategy.interface';

// 1. Clean, explicit imports of your strategies
import { EmailNotificationStrategy } from './strategies/email-notification.strategy';
import { SmsNotificationStrategy } from './strategies/sms-notification.strategy';
import { WebsocketNotificationStrategy } from './strategies/websocket-notification.strategy';

// 2. Put your strategy classes here directly
const STRATEGY_CLASSES = [
  EmailNotificationStrategy,
  SmsNotificationStrategy,
  WebsocketNotificationStrategy,
];

// 3. Clear, reliable provider factory configuration
const StrategyFactoryProvider: Provider = {
  provide: NOTIFICATION_STRATEGY_TOKEN,
  useFactory: (...instances: any[]) => instances,
  inject: STRATEGY_CLASSES,
};

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification_queue',
    }),
  ],
  controllers: [AdminNotificationController],
  providers: [
    NotificationService,
    NotificationProducer,
    NotificationConsumer,
    NotificationGateway,
    ...STRATEGY_CLASSES,       // Registers the strategies with the NestJS context container
    StrategyFactoryProvider,   // Aggregates them into the single injection token array
  ],
  exports: [NotificationProducer],
})
export class NotificationModule {}