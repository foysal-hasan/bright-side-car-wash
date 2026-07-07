import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectionAdminDto } from './dto/create-section.admin.dto';
import { QuerySectionsAdminDto } from './dto/query-sections.admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section.admin.dto';

@Injectable()
export class SectionsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionAdminDto) {
    return this.prisma.section.create({
      data: {
        section_key: dto.section_key,
        section_type: dto.section_type,
        content: this.toInputJsonValue(dto.content),
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async findAll(query: QuerySectionsAdminDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.SectionWhereInput = {
      ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
      ...(search
        ? {
            OR: [
              { section_key: { contains: search, mode: 'insensitive' } },
              { section_type: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.section.count({ where }),
      this.prisma.section.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { sort_order: 'asc' },
          { created_at: 'desc' },
        ],
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async upsertByKey(sectionKey: string, dto: UpdateSectionAdminDto) {
    const existingSection = await this.prisma.section.findUnique({
      where: { section_key: sectionKey },
    });

    if (!existingSection) {
      if (!dto.section_type || !dto.content) {
        throw new NotFoundException(
          `Section ${sectionKey} does not exist. Provide section_type and content to create via PATCH.`,
        );
      }

      return this.prisma.section.create({
        data: {
          section_key: sectionKey,
          section_type: dto.section_type,
          content: this.toInputJsonValue(dto.content),
          is_active: dto.is_active ?? true,
          sort_order: dto.sort_order ?? 0,
        },
      });
    }

    return this.prisma.section.update({
      where: { section_key: sectionKey },
      data: {
        section_type: dto.section_type,
        content:
          dto.content === undefined
            ? undefined
            : this.toInputJsonValue(dto.content),
        is_active: dto.is_active,
        sort_order: dto.sort_order,
      },
    });
  }

  async removeByKey(sectionKey: string) {
    await this.ensureSectionExists(sectionKey);
    await this.prisma.section.delete({ where: { section_key: sectionKey } });
    return null;
  }

  async findOneByKey(sectionKey: string) {
    return this.ensureSectionExists(sectionKey);
  }

  private async ensureSectionExists(sectionKey: string) {
    const section = await this.prisma.section.findUnique({
      where: { section_key: sectionKey },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionKey} not found`);
    }

    return section;
  }

  private toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
    // Normalize unknown object members into a strict JSON-compatible Prisma type.
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
