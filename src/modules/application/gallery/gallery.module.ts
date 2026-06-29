import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AppGalleryController } from './gallery.controller';


@Module({
  controllers: [AppGalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
