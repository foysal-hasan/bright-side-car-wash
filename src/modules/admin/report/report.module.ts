import { Module } from '@nestjs/common';
import { ReportsController } from './controllers/lead.controller';
import { ReportsService } from './services/lead.service';
import { CampaignReportsController } from './controllers/campaign.controller';
import { CampaignReportsService } from './services/campaign.service';
import { MemberActivityController } from './controllers/member-activity.controller';
import { MemberActivityService } from './services/member-activity.service';
import { DepositAnalyticsController } from './controllers/deposit-analytics.controller';
import { DepositAnalyticsService } from './services/deposit.analytics.service';

@Module({
  controllers: [ReportsController, CampaignReportsController, MemberActivityController, DepositAnalyticsController],
  providers: [ReportsService, CampaignReportsService, MemberActivityService, DepositAnalyticsService],
})
export class ReportModule {}
