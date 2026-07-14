import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllAdmin() {
    return this.prisma.gallery.findMany({
      orderBy: { created_at: 'desc' },
    });
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