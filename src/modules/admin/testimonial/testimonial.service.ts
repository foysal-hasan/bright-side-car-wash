import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetTestimonialsQueryDto } from './dto/get-testimonials-query.dto';
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
