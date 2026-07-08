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
import { GetServicesQueryDto } from './dto/get-services-query.dto';
import appConfig from 'src/config/app.config';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MailService } from 'src/mail/mail.service';
import { GetTaxesDto } from './dto/get-taxes.dto';

@ApiTags('Square Booking API')
@Controller('appointments')
export class SquareBookingController {
  constructor(
    private readonly bookingService: SquareUpBookingService,
    private readonly mailService: MailService,
  ) {}

  @ApiOperation({ summary: 'Create a new bookable service (Just for testing, not needed in a production application)' })
  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  async createNewService(@Body() dto: CreateBookableServiceDto) {
    const service = await this.bookingService.createBookableService(
      dto.name,
      dto.priceCents,
      dto.durationMinutes,
      dto.description,
    );
    return {
      success: true,
      message: 'Service created successfully',
      data: service,
    };
  }

  // 1. Fetch all business locations
  @ApiOperation({ summary: 'Fetch all business locations' })
  @Get('locations')
  async getLocations() {
    const locations = await this.bookingService.getLocations();
    return {
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
    };
  } 

  // 2. Fetch basic business info for booking page
  @ApiOperation({ summary: 'Fetch basic business info for booking page' })
  @Get('info')
  async getBookingBasicInfo() {
    const info = await this.bookingService.getBookingBasicInfo();
    return {
      success: true,
      message: 'Booking basic info retrieved successfully',
      data: info,
    };
  }

  // 3. Fetch all appointment services filtered by location
  @ApiOperation({ summary: 'Fetch all appointment services filtered by location' })
  @Get('services')
  @HttpCode(HttpStatus.OK)
  async getServices(@Query() query: GetServicesQueryDto) {
    query.limit = appConfig().square.limit || 100; // Default limit if not provided
    const services = await this.bookingService.getServices(query);
    return {
      success: true,
      message: 'Services retrieved successfully',
      lenth: services.data.length,
      data: services.data,
      nextCursor: services.nextCursor,
    };
  }

  // 4. Cart summary for one or more selected services
  @ApiOperation({ summary: 'Get cart summary for selected services' })
  @Post('cart/summary')
  @HttpCode(HttpStatus.OK)
  async getCartSummary(@Body() body: CartSummaryDto) {
    const summary = await this.bookingService.getCartSummary(body.locationId, body.serviceVariationIds);
    return {
      success: true,
      message: 'Cart summary retrieved successfully',
      data: summary,
    };
  }

  // 5. Query open slots based on selected date/range and cart services
  @ApiOperation({ summary: 'Query open slots based on selected date/range and cart services' })
  @Post('availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Body() body: CheckAvailabilityDto
  ) {
    const availability = await this.bookingService.checkAvailability(
      body.locationId,
      body.serviceVariationIds,
      body.date,
      body.startAt,
      body.endAt
    );
    return {
      success: true,
      message: 'Availability retrieved successfully',
      data: availability,
    };
  }

  // 6. Trigger virtual hold on specific slot
  @ApiOperation({ summary: 'Lock a specific time slot for selected services' })
  @Post('lock')
  async lockTimeSlot(
    @Body() body: LockTimeSlotDto
  ) {
    const lock = await this.bookingService.lockTimeSlot(
      body.locationId,
      body.startAt,
      body.cartId,
      body.serviceVariationIds
    );
    return {
      success: true,
      message: 'Time slot locked successfully',
      data: lock,
    };
  }

  // 6.1 Release lock if user abandons checkout
  @ApiOperation({ summary: 'Release a previously locked time slot' })
  @Post('lock/release')
  @HttpCode(HttpStatus.OK)
  async releaseLock(@Body() body: ReleaseLockDto) {
    const release = await this.bookingService.releaseLock(body.locationId, body.startAt, body.lockToken);
    return {
      success: true,
      message: 'Time slot released successfully',
      data: release,
    };
  }

  // // Get Taxes by varitants ids
  // @ApiOperation({ summary: 'Get taxes for selected service variation IDs' })
  // @Post('taxes')
  // @HttpCode(HttpStatus.OK)
  // async getTaxes(@Body() body: GetTaxesDto) {
  //   const taxes = await this.bookingService.getTaxes(body.locationId, body.serviceVariationIds);
  //   return {
  //     success: true,
  //     message: 'Taxes retrieved successfully',
  //     data: taxes,
  //   };
  // }

  // 7. Checkout: charge + create booking
  @ApiOperation({ summary: 'Confirm booking and process payment' })
  @Post('checkout')
  async confirmBooking(
    @Body() body: ConfirmBookingDto
  ) {
    const booking = await this.bookingService.confirmBookingWithDeposit(body);
    return {
      success: true,
      message: 'Booking confirmed successfully',
      data: booking,
    };
  }

  @ApiOperation({ summary: 'Send booking confirmation email (testing endpoint)' })
  @Post('test-confirmation-email')
  @HttpCode(HttpStatus.OK)
  async sendTestConfirmationEmail() {
    const now = new Date();
    const fallbackBookingId = `BK-TEST-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    const recipient = appConfig().defaultUser.system.email || appConfig().mail.from;

    await this.mailService.sendBookingConfirmationEmail({
      to: recipient,
      customerName: 'Test Customer',
      bookingId: fallbackBookingId,
      startAt: '2026-07-21T01:00:00Z',
      services: ['Online Booking Service'],
      totalCostCents: 4999,
      currency: 'USD',
    });

    return {
      success: true,
      message: 'Test booking confirmation email queued successfully',
      data: {
        to: recipient,
        bookingId: fallbackBookingId,
      },
    };
  }

  // // 8. Reschedule booking with optional fee collection
  // @ApiOperation({ summary: 'Reschedule an existing booking' })
  // @Post(':bookingId/reschedule')
  // async rescheduleBooking(
  //   @Param('bookingId') bookingId: string,
  //   @Body() body: RescheduleBookingDto,
  // ) {
  //   const reschedule = await this.bookingService.rescheduleBooking(bookingId, body);
  //   return {
  //     success: true,
  //     message: 'Booking rescheduled successfully',
  //     data: reschedule,
  //   };
  // }

  // // 9. Cancel booking with optional cancellation fee/refund handling
  // @ApiOperation({ summary: 'Cancel an existing booking' })
  // @Post(':bookingId/cancel')
  // async cancelBooking(
  //   @Param('bookingId') bookingId: string,
  //   @Body() body: CancelBookingDto,
  // ) {
  //   const cancel = await this.bookingService.cancelBooking(bookingId, body);
  //   return {
  //     success: true,
  //     message: 'Booking cancelled successfully',
  //     data: cancel,
  //   };
  // }
}