import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWashWithPurposeFaqDto } from './dto/create-wash-with-purpose-faq.dto';
import { UpdateWashWithPurposeFaqDto } from './dto/update-wash-with-purpose-faq.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class WashWithPurposeFaqService {
  constructor(private prisma: PrismaService) {}

  async create(createFaqDto: CreateWashWithPurposeFaqDto) {
    return this.prisma.washWithPurposeFaq.create({
      data: createFaqDto,
    });
  }

  async findAllAdmin() {
    return this.prisma.washWithPurposeFaq.findMany({
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async findAllUser() {
    return this.prisma.washWithPurposeFaq.findMany({
      where: { is_publish: true },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async findOne(id: string) {
    const faq = await this.prisma.washWithPurposeFaq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return faq;
  }

  async update(id: string, updateFaqDto: UpdateWashWithPurposeFaqDto) {
    const existingFaq = await this.findOne(id);

    // If a new icon is uploaded and an old one exists, optionally clean up the old file
    if (updateFaqDto.icon && existingFaq.icon) {
       const key = `${appConfig().storageUrl.washWithPurposeFAQ}${existingFaq.icon}`;
      SojebStorage.delete(key)
    }

    return this.prisma.washWithPurposeFaq.update({
      where: { id },
      data: updateFaqDto,
    });
  }

  async remove(id: string) {
    const faq = await this.findOne(id);

    // Optional: Delete physical icon file on removal
    if (faq.icon && faq.icon.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), faq.icon);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Failed to delete icon file:', err);
        }
      }
    }

    return this.prisma.washWithPurposeFaq.delete({
      where: { id },
    });
  }

  
}