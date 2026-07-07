import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectionAdminDto } from './dto/create-section.admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section.admin.dto';

@Injectable()
export class SectionsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionAdminDto) {
    return this.prisma.section.create({
      data: {
        section_key: dto.sectionKey,
        section_type: dto.sectionType,
        content: this.toInputJsonValue(dto.content),
        is_active: dto.isActive ?? true,
        sort_order: dto.sortOrder ?? 0,
      },
    });
  }

  async upsertByKey(sectionKey: string, dto: UpdateSectionAdminDto) {
    const existingSection = await this.prisma.section.findUnique({
      where: { section_key: sectionKey },
    });

    if (!existingSection) {
      if (!dto.sectionType || !dto.content) {
        throw new NotFoundException(
          `Section ${sectionKey} does not exist. Provide sectionType and content to create via PUT.`,
        );
      }

      return this.prisma.section.create({
        data: {
          section_key: sectionKey,
          section_type: dto.sectionType,
          content: this.toInputJsonValue(dto.content),
          is_active: dto.isActive ?? true,
          sort_order: dto.sortOrder ?? 0,
        },
      });
    }

    return this.prisma.section.update({
      where: { section_key: sectionKey },
      data: {
        section_type: dto.sectionType,
        content:
          dto.content === undefined
            ? undefined
            : this.toInputJsonValue(dto.content),
        is_active: dto.isActive,
        sort_order: dto.sortOrder,
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
