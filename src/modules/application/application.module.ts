import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { FaqModule } from './faq/faq.module';
import { GalleryModule } from './gallery/gallery.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { NewsAndEventsModule } from './news-and-events/news-and-events.module';
import { QuoteModule } from './quote/quote.module';
import { PagesApplicationModule } from './pages/pages.application.module';
import { WashWithPurposeFaqModule } from './wash-with-purpose-faq/wash-with-purpose-faq.module';


@Module({
  imports: [
  BookingModule,
  FaqModule,
  GalleryModule,
  TestimonialModule,
  NewsAndEventsModule,
  QuoteModule,
  PagesApplicationModule,
  WashWithPurposeFaqModule,
],
})
export class ApplicationModule {}
