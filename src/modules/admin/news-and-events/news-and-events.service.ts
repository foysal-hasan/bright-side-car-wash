import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateNewsAndEventDto } from './dto/create-news-and-event.dto';
import { UpdateNewsAndEventDto } from './dto/update-news-and-event.dto';
import { QueryNewsAndEventDto } from './dto/query-news-and-event.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NewsAndEventsService {
  constructor(private readonly prisma: PrismaService) { }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private async generate_unique_slug(title: string): Promise<string> {
    const base_slug = this.slugify(title);
    let unique_slug = base_slug;

    const existingCount = await this.prisma.newsAndEvent.count({
      where: { slug: base_slug },
    });

    if (existingCount === 0) {
      return unique_slug;
    }

    return `${base_slug}-${existingCount + 1}`;
  }

  // ==========================================
  // CATEGORIES CRUD
  // ==========================================
  async create_category(dto: CreateCategoryDto) {
    const slug = this.slugify(dto.name);
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A category with a similar name already exists');

    return this.prisma.category.create({
      data: { name: dto.name, slug },
    });
  }

  async find_all_categories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async find_one_category(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update_category(id: string, dto: UpdateCategoryDto) {
    await this.find_one_category(id);
    const slug = dto.name ? this.slugify(dto.name) : undefined;

    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name, ...(slug && { slug }) },
    });
  }

  async remove_category(id: string) {
    await this.find_one_category(id);

    // Check for dependent associations before deleting
    const linked_count = await this.prisma.newsAndEvent.count({ where: { category_id: id } });
    if (linked_count > 0) {
      throw new ConflictException('Cannot delete category with associated news or events items');
    }

    return this.prisma.category.delete({ where: { id } });
  }

  // ==========================================
  // NEWS AND EVENTS CRUD
  // ==========================================
  async create(dto: CreateNewsAndEventDto) {
    await this.find_one_category(dto.category_id);
    const slug = await this.generate_unique_slug(dto.title);

    return this.prisma.newsAndEvent.create({
      data: {
        title: dto.title,
        slug: slug,
        content: dto.content,
        summary: dto.summary,
        image_url: dto.image_url,
        category_id: dto.category_id,
        is_published: dto.is_published,
        created_by_id: dto.created_by_id,
      },
      include: { 
        category: true,
        creator: { select: { first_name: true, last_name: true, email: true } }
       },
    });
  }

  async find_all(query: QueryNewsAndEventDto) {
    const { search, category_id, page, limit } = query;
    const skip = (page - 1) * limit;

    const where_clause: any = {};
    if (category_id) where_clause.category_id = category_id;
    if (search) {
      where_clause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.newsAndEvent.findMany({
        where: where_clause,
        skip,
        take: limit,
        include: { 
          category: true,
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

  async find_one(id: string) {
    const record = await this.prisma.newsAndEvent.findUnique({
      where: { id },
      include: { 
        category: true,
        creator: { select: { first_name: true, last_name: true, email: true } }
      },
    });
    if (!record) throw new NotFoundException(`News or event entry not found`);
    return record;
  }

  async update(id: string, dto: UpdateNewsAndEventDto) {
    const existing = await this.find_one(id);
    const update_data: any = {};

    if (dto.category_id) await this.find_one_category(dto.category_id);

    if (dto.title && dto.title !== existing.title) {
      update_data.title = dto.title;
      update_data.slug = await this.generate_unique_slug(dto.title);
    }
    if (dto.content !== undefined) update_data.content = dto.content;
    if (dto.summary !== undefined) update_data.summary = dto.summary;
    if (dto.category_id !== undefined) update_data.category_id = dto.category_id;
    if (dto.is_published !== undefined) update_data.is_published = dto.is_published;
    if (dto.image_url !== undefined) update_data.image_url = dto.image_url;

    const updatedNewsAndEvent = await this.prisma.newsAndEvent.update({
      where: { id },
      data: update_data,
      include: { 
        category: true,
        creator: { select: { first_name: true, last_name: true, email: true } }
      },
    });
    return {
      updatedNewsAndEvent,
      existing_image_url: dto.image_url !== undefined ? existing.image_url : null,
    };
  }

  async remove(id: string) {
    const existing = await this.find_one(id);
    await this.prisma.newsAndEvent.delete({ where: { id } });
    return { deleted_id: id, deleted_image_url: existing.image_url };
  }
}