import { Module } from '@nestjs/common';
import { SquareBookingController } from './square-booking.controller';
import { SquareUpBookingService } from './squareup-booking.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 600000, // global cache default to 10 minutes in milliseconds
    }),
  ],
  controllers: [SquareBookingController],
  providers: [SquareUpBookingService],
})
export class BookingModule {}
