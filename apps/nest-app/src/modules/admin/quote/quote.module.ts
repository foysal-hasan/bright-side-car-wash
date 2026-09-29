import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
