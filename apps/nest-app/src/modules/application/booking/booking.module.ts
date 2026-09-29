import { Module } from '@nestjs/common';
import { SquareBookingController } from './square-booking.controller';
import { SquareUpBookingService } from './squareup-booking.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { AvailabilityCronService } from './availability-cron.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 600000, // global cache default to 10 minutes in milliseconds
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [SquareBookingController],
  providers: [SquareUpBookingService, AvailabilityCronService],
})
export class BookingModule {}
