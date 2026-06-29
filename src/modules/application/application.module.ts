import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { FaqModule } from './faq/faq.module';
import { GalleryModule } from './gallery/gallery.module';
import { TestimonialModule } from './testimonial/testimonial.module';


@Module({
  imports: [
  BookingModule,
  FaqModule,
  GalleryModule,
  TestimonialModule
],
})
export class ApplicationModule {}
