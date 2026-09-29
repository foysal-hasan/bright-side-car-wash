import { Module } from '@nestjs/common';
import { PagesApplicationController } from './pages.application.controller';
import { PagesApplicationService } from './pages.application.service';

@Module({
  controllers: [PagesApplicationController],
  providers: [PagesApplicationService],
})
export class PagesApplicationModule {}
