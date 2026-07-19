import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SquareUpBookingService } from './squareup-booking.service';

// Validate timezone is valid
function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Change this to your preferred timezone
const CRON_TIMEZONE = 'UTC'; // e.g., 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'

@Injectable()
export class AvailabilityCronService implements OnModuleInit {
  private readonly logger = new Logger(AvailabilityCronService.name);

  constructor(private readonly bookingService: SquareUpBookingService) {
    // Validate timezone on service instantiation
    if (!isValidTimeZone(CRON_TIMEZONE)) {
      throw new Error(`Invalid timezone configured: ${CRON_TIMEZONE}. Please use a valid IANA timezone.`);
    }
    this.logger.log(`Availability cron job configured with timezone: ${CRON_TIMEZONE}`);
  }

  // Run every day at 12:00 AM (midnight) in your desired time zone
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: CRON_TIMEZONE,
  })
  async handleDailyAvailabilityCache() {
    this.logger.log('Daily availability cache job triggered');
    await this.bookingService.precacheAvailability();
  }

  // Optional: Also run once on module initialization to cache immediately
  async onModuleInit() {
    this.logger.log('Initial availability cache on module init');
    // await this.bookingService.precacheAvailability(); // TODO: uncomment for production
  }
}
