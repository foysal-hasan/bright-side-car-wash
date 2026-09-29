import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { GallerySortField, QueryGalleryDto } from './dto/query-gallery.dto';
import { Prisma } from 'src/generated/prisma/browser';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) { }


  async findAll(query: QueryGalleryDto) {
    const { search, is_published, sort_by, sort_order, page, limit } = query;

    const where: Prisma.GalleryWhereInput = {};

    // 1. Text Search Filter
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // 2. Boolean Publish Filter
    if (is_published !== undefined) {
      where.is_published = is_published === 'true';
    }

    // 3. Dynamic Sorting
    const orderByField = sort_by || GallerySortField.CREATED_AT;
    const orderByDirection = sort_order || 'desc';

    const orderBy: Prisma.GalleryOrderByWithRelationInput = {
      [orderByField]: orderByDirection,
    };

    // 4. Pagination math
    const skip = (page - 1) * limit;

    // 5. Database transaction execution
    const [total, galleries] = await this.prisma.$transaction([
      this.prisma.gallery.count({ where }),
      this.prisma.gallery.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      galleries,
      meta: {
        total_items: total,
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.gallery.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Gallery record with ID "${id}" not found`);
    }
    return item;
  }

  async create(dto: CreateGalleryDto) {
    return this.prisma.gallery.create({
      data: {
        name: dto.name,
        image: dto.image!,
        is_published: dto.is_published ?? true,
      }
    });
  }

  async update(id: string, dto: UpdateGalleryDto) {
    const item = await this.findOne(id);
    if (!item) {
      throw new NotFoundException(`Gallery record with ID "${id}" not found`);
    }
    const updatedGallery = await this.prisma.gallery.update({
      where: { id },
      data: dto,
    });
    return {
      updatedGallery,
      existingImage: item.image,
    };
  }

  async remove(id: string) {
    await this.prisma.gallery.delete({ where: { id } });
    return null;
  }
}