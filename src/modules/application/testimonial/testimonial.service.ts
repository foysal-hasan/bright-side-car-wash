import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetTestimonialsQueryDto } from './dto/get-testimonials-query.dto';

@Injectable()
export class TestimonialService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: GetTestimonialsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [totalItems, testimonials] = await this.prisma.$transaction([
      this.prisma.testimonial.count(),
      this.prisma.testimonial.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      testimonials,
      meta: {
        totalItems,
        itemCount: testimonials.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

}
