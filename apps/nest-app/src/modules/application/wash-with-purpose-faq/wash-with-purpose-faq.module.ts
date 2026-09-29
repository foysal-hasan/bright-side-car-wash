import { Module } from '@nestjs/common';
import { WashWithPurposeFaqService } from './wash-with-purpose-faq.service';
import { WashWithPurposeFaqController } from './wash-with-purpose-faq.controller';

@Module({
  controllers: [WashWithPurposeFaqController],
  providers: [WashWithPurposeFaqService],
})
export class WashWithPurposeFaqModule {}
