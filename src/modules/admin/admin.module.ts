import { Module } from '@nestjs/common';

import { WebsiteInfoModule } from './website-info/website-info.module';
import { StageModule } from './stage/stage.module';
import { LeadModule } from './lead/lead.module';

@Module({
  imports: [
    WebsiteInfoModule,
    StageModule,
    LeadModule,
  ],
})
export class AdminModule {}
