import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetTestimonialsQueryDto, TestimonialSortField } from './dto/get-testimonials-query.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class TestimonialService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: {
        avatar: dto.avatar,
        name: dto.name,
        designation: dto.designation,
        review_text: dto.review_text,
        ratings: dto.ratings,
        is_active: dto.is_active,
      },
    });
  }


  async findAll(query: GetTestimonialsQueryDto) {
    const { search, ratings, is_active, sort_by, sort_order, page, limit } = query;

    const where: Prisma.TestimonialWhereInput = {};

    // 1. Structural multi-field text search filters
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { review_text: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 2. Exact match filters (Integer Ratings)
    if (ratings) {
      where.ratings = ratings;
    }

    // 3. Boolean mapping filters
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // 4. Dynamic sorting resolution
    const orderByField = sort_by || TestimonialSortField.CREATED_AT;
    const orderByDirection = sort_order || 'desc';

    const orderBy: Prisma.TestimonialOrderByWithRelationInput = {
      [orderByField]: orderByDirection,
    };

    // 5. Pagination offset execution
    const skip = (page - 1) * limit;

    // 6. Database transaction coordination
    const [total, testimonials] = await this.prisma.$transaction([
      this.prisma.testimonial.count({ where }),
      this.prisma.testimonial.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      testimonials,
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
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      throw new NotFoundException(`Testimonial record with ID "${id}" was not found.`);
    }

    return testimonial;
  }


  async update(id: string, dto: UpdateTestimonialDto) {
    const existingTestimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });

    if (!existingTestimonial) {
      throw new NotFoundException(`Testimonial record with ID "${id}" was not found.`);
    }

    const data: Prisma.TestimonialUpdateInput = {};

    if (dto.avatar) {
      data.avatar = dto.avatar;
    }

    if (dto.is_avatar_deleted) {
      data.avatar = null;
    }

    if (dto.name && dto.name.trim() !== '') {
      data.name = dto.name;
    }

    if (dto.designation && dto.designation.trim() !== '') {
      data.designation = dto.designation;
    }

    if (dto.review_text && dto.review_text.trim() !== '') {
      data.review_text = dto.review_text;
    }

    if (dto.ratings) {
      data.ratings = dto.ratings;
    }

    if (dto.is_active !== undefined) {
      data.is_active = dto.is_active;
    }

    const updatedTestimonial = await this.prisma.testimonial.update({
      where: { id },
      data,
    });

    return {
      updatedTestimonial,
      existingAvatar: existingTestimonial?.avatar,
    };
  }

  async remove(id: string) {
    await this.prisma.testimonial.delete({
      where: { id },
    });

    return null;
  }
}
