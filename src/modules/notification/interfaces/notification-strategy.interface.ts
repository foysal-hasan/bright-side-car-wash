import { NotificationChannel } from "src/generated/prisma/enums";

export const NOTIFICATION_STRATEGY_TOKEN = 'NOTIFICATION_STRATEGY_TOKEN';

export interface NotificationPayload {
  recipient: string;
  title: string;
  body: string;
  metadata?: any;
}

export interface NotificationStrategy {
  readonly channel: NotificationChannel; 
  send(payload: NotificationPayload): Promise<boolean>;
}

export const RegisterStrategy = () => (target: any) => {
  Reflect.defineMetadata('is_notification_strategy', true, target);
};