import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PagesApplicationService {
  constructor(private readonly prisma: PrismaService) { }

  async getActivePageSections(pageName: string, keys: string[] = []) {
    const normalizedPageName = pageName.trim().toLowerCase();

    const where = {
      is_active: true,
      section_key: normalizedPageName
    };

    return this.prisma.section.findFirst({
      where,
    });
  }
}
