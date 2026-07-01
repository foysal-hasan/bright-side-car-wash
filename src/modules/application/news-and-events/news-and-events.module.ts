import { Module } from '@nestjs/common';
import { NewsAndEventsService } from './news-and-events.service';
import { NewsAndEventsController } from './news-and-events.controller';

@Module({
  controllers: [NewsAndEventsController],
  providers: [NewsAndEventsService],
})
export class NewsAndEventsModule {}
