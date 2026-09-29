import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class WashWithPurposeFaqService {
  constructor(private prisma: PrismaService) {}
  async findAllUser() {
    return this.prisma.washWithPurposeFaq.findMany({
      where: { is_publish: true },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });
  }
}