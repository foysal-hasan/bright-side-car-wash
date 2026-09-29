import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    ActivityLogModule,
    MailModule,
  ],
  controllers: [LeadController],
  providers: [LeadService],
})
export class LeadModule {}
