import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AdminGalleryController } from './gallery.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [AdminGalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
