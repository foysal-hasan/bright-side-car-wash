import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { FaqModule } from './faq/faq.module';
import { GalleryModule } from './gallery/gallery.module';


@Module({
  imports: [
  BookingModule,
  FaqModule,
  GalleryModule
],
})
export class ApplicationModule {}
