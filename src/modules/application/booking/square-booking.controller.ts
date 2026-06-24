import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SquareBookingService } from './square-booking.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { LockTimeSlotDto } from './dto/lock-time-slot.dto';

@Controller('api/appointments')
export class SquareBookingController {
  constructor(private readonly bookingService: SquareBookingService) {}

  // 1. Fetch all business locations
  @Get('locations')
  async getLocations() {
    return await this.bookingService.getLocations();
  }

  // 2. Fetch all car wash / detailing services
  @Get('services')
  async getServices() {
    return await this.bookingService.getServices();
  }

  // 3. Query open slots based on the client's custom cart contents
  @Post('availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Body() body: CheckAvailabilityDto
  ) {
    return await this.bookingService.checkAvailability(
      body.locationId,
      body.serviceVariationIds,
      body.startAt,
      body.endAt
    );
  }

  // 4. Trigger the 10-Minute memory hold on a specific time slot
  @Post('lock')
  async lockTimeSlot(
    @Body() body: LockTimeSlotDto
  ) {
    return await this.bookingService.lockTimeSlot(
      body.locationId,
      body.startAt,
      body.cartId
    );
  }

  // 5. Finalize payment tokenization and register booking in Square Dashboard
  @Post('checkout')
  async confirmBooking(
    @Body() body: ConfirmBookingDto
  ) {
    return await this.bookingService.confirmBookingWithDeposit(body);
  }
}