import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AdminGalleryController } from './gallery.controller';

@Module({
  controllers: [AdminGalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
