import { Module } from '@nestjs/common';
import { TemplatesController } from './template.controller';
import { TemplatesService } from './template.service';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';


@Module({
  imports: [
     ActivityLogModule
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplateModule {}
