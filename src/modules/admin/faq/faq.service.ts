import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqSortField, QueryFaqDto } from './dto/query-faq.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFaqDto) {
    const { search, is_active, sort_by, sort_order, page, limit } = query;

    // 1. Build out structural dynamic where conditions
    const where: Prisma.FaqWhereInput = {};

    // Handles textual search across fields safely
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Handles mapping Boolean string flags
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // 2. Build dynamic sorting conditions
    // Fallback safely if something bypasses validation pipelines
    const orderByField = sort_by || FaqSortField.DISPLAY_ORDER;
    const orderByDirection = sort_order || 'asc';
    
    const orderBy: Prisma.FaqOrderByWithRelationInput = {
      [orderByField]: orderByDirection,
    };

    // 3. Compute structural pagination metrics
    const skip = (page - 1) * limit;

    // 4. Run total count and query concurrently to keep DB execution optimized
    const [total, data] = await this.prisma.$transaction([
      this.prisma.faq.count({ where }),
      this.prisma.faq.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      faqs: data,
      meta: {
        total_items: total,
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
        has_next_page: page * limit < total,
        has_previous_page: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID "${id}" was not found`);
    }
    return faq;
  }

  async create(dto: CreateFaqDto) {
    return this.prisma.faq.create({ data: dto });
  }

  async update(id: string, dto: UpdateFaqDto) {
    await this.findOne(id);
    return this.prisma.faq.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.faq.delete({ where: { id } });
  }
}