import { Module } from '@nestjs/common';

import { WebsiteInfoModule } from './website-info/website-info.module';
import { StageModule } from './stage/stage.module';
import { LeadModule } from './lead/lead.module';
import { CampaignModule } from './campaign/campaign.module';
import { RoleModule } from './role/role.module';
import { TeamModule } from './team/team.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { TemplateModule } from './template/template.module';
import { ReportModule } from './report/report.module';
import { EmailManagementModule } from './email-management/email-management.module';
import { FaqModule } from './faq/faq.module';
import { GalleryModule } from './gallery/gallery.module';
import { TestimonialModule } from './testimonial/testimonial.module';


@Module({
  imports: [
    WebsiteInfoModule,
    StageModule,
    LeadModule,
    CampaignModule,
    RoleModule,
    TeamModule,
    ActivityLogModule,
    TemplateModule,
    ReportModule,
    EmailManagementModule,
    FaqModule,
    GalleryModule,
    TestimonialModule
  ],
})
export class AdminModule {}
