import { Module } from '@nestjs/common';
import { WashWithPurposeFaqService } from './wash-with-purpose-faq.service';
import { WashWithPurposeFaqController } from './wash-with-purpose-faq.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [WashWithPurposeFaqController],
  providers: [WashWithPurposeFaqService],
})
export class WashWithPurposeFaqModule { }
