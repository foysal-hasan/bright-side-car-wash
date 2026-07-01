import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationProducer } from './queue/notification.producer';
import { NotificationChannel } from 'src/generated/prisma/browser';

@ApiTags('Admin / Notification Logs')
@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly service: NotificationService, private readonly notification: NotificationProducer) {}

  @Get('logs')
  @ApiOperation({ summary: 'Review comprehensive history of dispatches' })
  get_logs(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    return this.service.get_audit_logs(page, limit);
  }

  @Get('test')
  async test_notification() {
    const user_id = 'some-user-uuid'; // Replace with actual user UUID
    const booking_id = 'some-booking-id'; // Replace with actual booking ID

    await this.notification.trigger(NotificationChannel.IN_APP, {
      recipient: user_id, // The specific user's UUID
      title: 'Booking Confirmed! 🎉',
      body: 'Your slot has been successfully scheduled.',
      metadata: { booking_id }, // Optional structural JSON data
    });
  }
}