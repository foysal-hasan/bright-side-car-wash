import { Module } from '@nestjs/common';
import { CampaignController } from './controllers/campaign.controller';
import { BrevoProvider } from './providers/brevo.provider';
import { EMAIL_PROVIDER_TOKEN } from './constants';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { WebhookController } from './controllers/webhook.controller';
import { CampaignOrchestratorService } from './services/campaign-orchestrator.service';
import { LeadGroupService } from './services/lead-group.service';
import { CampaignService } from './services/campaign.service';


@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [CampaignController, WebhookController],
  providers: [
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useClass: BrevoProvider,
    },
    CampaignService,
    CampaignOrchestratorService,
    LeadGroupService,
  ],
  exports: [CampaignOrchestratorService],
})
export class CampaignModule {}
