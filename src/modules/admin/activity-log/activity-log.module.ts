import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogModule as CoreActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    CoreActivityLogModule,
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
})
export class ActivityLogModule {}
