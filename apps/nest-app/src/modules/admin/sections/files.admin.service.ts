import { Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'path';
import { MediaFile } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { QueryMediaFilesAdminDto } from './dto/query-media-files.admin.dto';
import { UpdateMediaFileAdminDto } from './dto/update-media-file.admin.dto';

@Injectable()
export class FilesAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeFilename(filename: string): string {
    const nameWithoutExtension = filename.replace(extname(filename), '');
    return nameWithoutExtension.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private async storeFile(file: Express.Multer.File) {
    const generatedFilename = `${Date.now()}-${StringHelper.randomString(10)}-${this.normalizeFilename(file.originalname)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.sectionMedia}${generatedFilename}`;

    await SojebStorage.put(key, file.buffer);

    return this.prisma.mediaFile.create({
      data: {
        filename: generatedFilename,
        path: key,
        mime_type: file.mimetype,
        size: file.size,
      },
    });
  }

  async uploadMany(files: Express.Multer.File[]) {
    const uploadedFiles = await Promise.all(files.map((file) => this.storeFile(file)));
    return uploadedFiles.map((file) => this.serializeMediaFile(file));
  }

  async findAll(query: QueryMediaFilesAdminDto) {
    const where: {
      OR?: Array<{ filename?: { contains: string; mode: 'insensitive' }; mime_type?: { contains: string; mode: 'insensitive' } }>;
      mime_type?: { startsWith: string };
    } = {};

    if (query.search) {
      where.OR = [
        { filename: { contains: query.search, mode: 'insensitive' } },
        { mime_type: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.mimeTypePrefix) {
      where.mime_type = { startsWith: query.mimeTypePrefix };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.mediaFile.count({ where }),
      this.prisma.mediaFile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: data.map((file) => this.serializeMediaFile(file)),
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

  async findOne(id: string) {
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }

    return this.serializeMediaFile(file);
  }

  async remove(id: string) {
    const existingFile = await this.prisma.mediaFile.findUnique({ where: { id } });

    if (!existingFile) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }

    await this.prisma.mediaFile.delete({ where: { id } });
    await SojebStorage.delete(existingFile.path);

    return this.serializeMediaFile(existingFile);
  }

  private serializeMediaFile(file: MediaFile) {
    return {
      ...file,
      url: SojebStorage.url(file.path),
    };
  }
}
