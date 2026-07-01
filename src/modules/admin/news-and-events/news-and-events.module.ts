import { Module } from '@nestjs/common';
import { NewsAndEventsService } from './news-and-events.service';
import { NewsAndEventsController } from './news-and-events.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [NewsAndEventsController],
  providers: [NewsAndEventsService],
})
export class NewsAndEventsModule {}
