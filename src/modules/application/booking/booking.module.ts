import { Module } from '@nestjs/common';
import { BookingService, SquareService } from './booking.service';
import { BookingController } from './booking.controller';
import { SquareBookingController } from './square-booking.controller';
import { SquareBookingService } from './square-booking.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 600000, // global cache default to 10 minutes in milliseconds
    }),
  ],
  controllers: [
    BookingController, 
    SquareBookingController
  ],
  providers: [
    SquareService, 
    BookingService,
    SquareBookingService
  ],
})
export class BookingModule {}
