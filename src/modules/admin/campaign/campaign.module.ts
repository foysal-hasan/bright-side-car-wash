import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { BrevoProvider } from './providers/brevo.provider';
import { EMAIL_PROVIDER_TOKEN } from './constants';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [CampaignController],
  providers: [
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useClass: BrevoProvider, 
    },
    CampaignService
  ],
})
export class CampaignModule {}
