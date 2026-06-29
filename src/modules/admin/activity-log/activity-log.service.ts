import { Injectable } from '@nestjs/common';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryActivityLogDto } from './dto/query.dto';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}
  async findAll(queryDto: QueryActivityLogDto) {
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const data = await this.prisma.activityLog.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalCount = await this.prisma.activityLog.count();
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.activityLog.findUnique({
      where: { id },
    });
  }

  async remove(id: string) {
    await this.prisma.activityLog.delete({
      where: { id },
    });

    return null
  }
}
