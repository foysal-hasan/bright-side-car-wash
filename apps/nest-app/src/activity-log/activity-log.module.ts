import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { BullModule } from '@nestjs/bullmq';
import { ActivityLogInterceptor } from './interceptor/activity-log.interceptor';
import { ActivityLogProcessor } from './processors/activity-log.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'activity-logs-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: {
          age: 60 * 60 * 24, // Keep failed jobs 24h
        },
      },
    }),
  ],
  controllers: [],
  providers: [
    ActivityLogService, 
    ActivityLogInterceptor, 
    ActivityLogProcessor 
  ],
  exports: [
    ActivityLogInterceptor, 
    BullModule         
  ],
})
export class ActivityLogModule {}
