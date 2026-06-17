import { Module } from '@nestjs/common';

import { WebsiteInfoModule } from './website-info/website-info.module';

@Module({
  imports: [
    WebsiteInfoModule,
  ],
})
export class AdminModule {}
