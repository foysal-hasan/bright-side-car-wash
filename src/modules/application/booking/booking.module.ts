import { Module } from '@nestjs/common';
import { BookingService, SquareService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  controllers: [BookingController],
  providers: [SquareService, BookingService],
})
export class BookingModule {}
