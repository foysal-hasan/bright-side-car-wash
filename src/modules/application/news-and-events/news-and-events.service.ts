import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryNewsAndEventDto } from './dto/query-news-and-event.dto';

@Injectable()
export class NewsAndEventsService {
  constructor(private readonly prisma: PrismaService) { }

  async get_categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async find_all_published(query: QueryNewsAndEventDto) {
    const { search, category_id, page, limit } = query;
    const skip = (page - 1) * limit;

    const where_clause: any = { is_published: true };
    if (category_id) where_clause.category_id = category_id;
    if (search) {
      where_clause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.newsAndEvent.findMany({
        where: where_clause,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          creator: { select: { first_name: true, last_name: true, email: true } }
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.newsAndEvent.count({ where: where_clause }),
    ]);

    return {
      items: data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        next_page: page * limit < total ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
      }
    };
  }

  async find_by_slug(slug: string) {
    const record = await this.prisma.newsAndEvent.findUnique({
      where: { slug, is_published: true },
      include: { 
        category: { select: { name: true, slug: true } },
        creator: { select: { first_name: true, last_name: true, email: true } }
      },
    });
    if (!record) throw new NotFoundException(`The requested entry could not be located.`);
    return record;
  }
}