import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { FaqModule } from './faq/faq.module';
import { GalleryModule } from './gallery/gallery.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { NewsAndEventsModule } from './news-and-events/news-and-events.module';


@Module({
  imports: [
  BookingModule,
  FaqModule,
  GalleryModule,
  TestimonialModule,
  NewsAndEventsModule
],
})
export class ApplicationModule {}
