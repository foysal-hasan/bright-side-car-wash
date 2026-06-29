import { Module } from '@nestjs/common';
import { AdminFaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';


@Module({
  imports: [ActivityLogModule],
  controllers: [AdminFaqController],
  providers: [FaqService],
})
export class FaqModule {}
