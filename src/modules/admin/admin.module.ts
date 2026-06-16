import { Module } from '@nestjs/common';

import { WebsiteInfoModule } from './website-info/website-info.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    WebsiteInfoModule,
    StaffModule,
  ],
})
export class AdminModule {}
