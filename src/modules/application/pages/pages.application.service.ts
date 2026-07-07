import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PagesApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivePageSections(pageName: string, keys: string[] = []) {
    const normalizedPageName = pageName.trim().toLowerCase();
    const prefix = `${normalizedPageName}_`;

    const where = {
      is_active: true,
      OR: [
        { section_key: { startsWith: prefix, mode: 'insensitive' as const } },
        ...(keys.length > 0 ? [{ section_key: { in: keys } }] : []),
      ],
    };

    return this.prisma.section.findMany({
      where,
      orderBy: {
        sort_order: 'asc',
      },
    });
  }
}
