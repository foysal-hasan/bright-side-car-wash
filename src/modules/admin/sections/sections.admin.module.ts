import { Module } from '@nestjs/common';
import { FilesAdminController } from './files.admin.controller';
import { FilesAdminService } from './files.admin.service';
import { SectionsAdminController } from './sections.admin.controller';
import { SectionsAdminService } from './sections.admin.service';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [SectionsAdminController, FilesAdminController],
  providers: [SectionsAdminService, FilesAdminService],
})
export class SectionsAdminModule {}
