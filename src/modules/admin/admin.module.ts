import { Module } from '@nestjs/common';

import { WebsiteInfoModule } from './website-info/website-info.module';
import { StageModule } from './stage/stage.module';
import { LeadModule } from './lead/lead.module';
import { CampaignModule } from './campaign/campaign.module';

@Module({
  imports: [
    WebsiteInfoModule,
    StageModule,
    LeadModule,
    CampaignModule
  ],
})
export class AdminModule {}
