import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { SquareUpBookingService } from './squareup-booking.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { LockTimeSlotDto } from './dto/lock-time-slot.dto';
import { CartSummaryDto } from './dto/cart-summary.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ReleaseLockDto } from './dto/release-lock.dto';
import { CreateBookableServiceDto } from './dto/create-service.dto';

@Controller('api/appointments')
export class SquareBookingController {
  constructor(private readonly bookingService: SquareUpBookingService) {}

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  async createNewService(@Body() dto: CreateBookableServiceDto) {
    return await this.bookingService.createBookableService(
      dto.name,
      dto.priceCents,
      dto.durationMinutes,
      dto.description,
    );
  }

  // 1. Fetch all business locations
  @Get('locations')
  async getLocations() {
    return await this.bookingService.getLocations();
  }

  // 2. Fetch basic business info for booking page
  @Get('info')
  async getBookingBasicInfo() {
    return await this.bookingService.getBookingBasicInfo();
  }

  // 3. Fetch all appointment services filtered by location
  @Get('services')
  async getServices(@Query('locationId') locationId?: string) {
    return await this.bookingService.getServices(locationId);
  }

  // 4. Cart summary for one or more selected services
  @Post('cart/summary')
  @HttpCode(HttpStatus.OK)
  async getCartSummary(@Body() body: CartSummaryDto) {
    return await this.bookingService.getCartSummary(body.locationId, body.serviceVariationIds);
  }

  // 5. Query open slots based on selected date/range and cart services
  @Post('availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Body() body: CheckAvailabilityDto
  ) {
    return await this.bookingService.checkAvailability(
      body.locationId,
      body.serviceVariationIds,
      body.date,
      body.startAt,
      body.endAt
    );
  }

  // 6. Trigger virtual hold on specific slot
  @Post('lock')
  async lockTimeSlot(
    @Body() body: LockTimeSlotDto
  ) {
    return await this.bookingService.lockTimeSlot(
      body.locationId,
      body.startAt,
      body.cartId,
      body.serviceVariationIds
    );
  }

  // 6.1 Release lock if user abandons checkout
  @Post('lock/release')
  @HttpCode(HttpStatus.OK)
  async releaseLock(@Body() body: ReleaseLockDto) {
    return await this.bookingService.releaseLock(body.locationId, body.startAt, body.lockToken);
  }

  // 7. Checkout: charge + create booking
  @Post('checkout')
  async confirmBooking(
    @Body() body: ConfirmBookingDto
  ) {
    return await this.bookingService.confirmBookingWithDeposit(body);
  }

  // 8. Reschedule booking with optional fee collection
  @Post(':bookingId/reschedule')
  async rescheduleBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: RescheduleBookingDto,
  ) {
    return await this.bookingService.rescheduleBooking(bookingId, body);
  }

  // 9. Cancel booking with optional cancellation fee/refund handling
  @Post(':bookingId/cancel')
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: CancelBookingDto,
  ) {
    return await this.bookingService.cancelBooking(bookingId, body);
  }
}