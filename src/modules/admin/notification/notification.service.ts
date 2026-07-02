import { Injectable } from '@nestjs/common';
import { OffsetPaginationDto, CursorPaginationDto } from './dto/get-notifications.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationChannel } from 'src/generated/prisma/browser';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches unread, read, and global totals for a specific recipient profile
   */
  async get_notification_metrics(recipient: string) {
    const counts = await this.prisma.notificationLog.groupBy({
      by: ['is_read'],
      where: { recipient, channel: NotificationChannel.IN_APP },
      _count: { id: true },
    });

    let read = 0;
    let unread = 0;

    for (const item of counts) {
        console.log('item:', item);
      if (item.is_read) read = item._count.id;
      else unread = item._count.id;
    }

    return {
      total: read + unread,
      read,
      unread,
    };
  }

  /**
   * Method 1: Standard Offset Pagination (Best for numbered UI tables)
   */
  async find_many_offset(recipient: string, dto: OffsetPaginationDto) {
    const { page, limit } = dto;
    const skip = (page - 1) * limit;

    const items = await this.prisma.notificationLog.findMany({
      where: { recipient, channel: NotificationChannel.IN_APP },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    const total = await this.prisma.notificationLog.count({
      where: { recipient, channel: NotificationChannel.IN_APP },
    });

    return {
      items,
      meta: {
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
   
    };
  }

  /**
   * Method 2: High-Performance Cursor Pagination (Best for mobile app infinite scrolls)
   */
  async find_many_cursor(recipient: string, dto: CursorPaginationDto) {
    const { cursor, limit } = dto;

    const data = await this.prisma.notificationLog.findMany({
      where: { recipient, channel: NotificationChannel.IN_APP },
      take: limit + 1, // Fetch an extra record to reliably determine if a next page exists
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor element itself if it is provided
      orderBy: { created_at: 'desc' },
    });

    const has_next_page = data.length > limit;
    if (has_next_page) {
      data.pop(); // Remove the extra record used for checking
    }

    const next_cursor = has_next_page ? data[data.length - 1].id : null;

    return {
      data,
      meta: {
        next_cursor,
        has_next_page,
        limit,
      }
    };
  }

  /**
   * Quick utility to mark a notification as read
   */
  async mark_as_read(id: string, recipient: string) {
    return this.prisma.notificationLog.updateMany({
      where: { id, recipient },
      data: { is_read: true },
    });
  }

    /**
     * mark as read all
     * */
    async mark_all_as_read(recipient: string) {
    return this.prisma.notificationLog.updateMany({
      where: { recipient, is_read: false },
      data: { is_read: true },
    });
  }
}