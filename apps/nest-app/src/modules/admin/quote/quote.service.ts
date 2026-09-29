import { Injectable, NotFoundException } from '@nestjs/common';
import { FindAllQuotesDto } from './dto/find-all-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class QuoteService {
  constructor(private readonly prisma: PrismaService) {}


  async findAll(query: FindAllQuotesDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { vehicle: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.quote.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID "${id}" not found`);
    }

    return quote;
  }


  async update(id: string, updateQuoteDto: UpdateQuoteDto) {
    // Ensure record exists before updating
    await this.findOne(id);

    return this.prisma.quote.update({
      where: { id },
      data: {
        ...updateQuoteDto,
        ...(updateQuoteDto.date && { date: new Date(updateQuoteDto.date) }),
      },
    });
  }


  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quote.delete({
      where: { id },
    });
  }
    
}