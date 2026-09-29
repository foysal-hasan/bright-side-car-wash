import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { TemplateQueryDto } from './dto/query-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) { }

  async create(createTemplateDto: CreateTemplateDto, currentUserId?: string) {
    const { name, description, type, editorType, emailBody, fileIds } = createTemplateDto;

    // check files are exist or not
    if (fileIds && fileIds.length > 0) {
      const existingFiles = await this.prisma.fileRecord.findMany({
        where: {
          id: {
            in: fileIds,
          },
        },
      });
      if (existingFiles.length !== fileIds.length) {
        throw new NotFoundException('Some files do not exist');
      }
    }


    return this.prisma.$transaction(async tx => {
      const template = await tx.template.create({
        data: {
          name,
          description,
          type,
          editorType,
          userId: currentUserId || null,
          // Atomic nested write if type is EMAIL and payload exists
          ...(type === 'EMAIL' && emailBody && {
            emailBody: {
              create: {
                subject: emailBody.subject,
                htmlContent: emailBody.htmlContent,
                designJson: emailBody.designJson || undefined,
              },
            },
          }),
        },
        include: { emailBody: true },
      })

      // Attach file records to the template
      if (fileIds?.length > 0) {
        await tx.fileRecord.updateMany({
          where: {
            id: {
              in: fileIds,
            },
          },
          data: {
            templateId: template.id,
          },
        })
      }

      return template;
    });
  }

  async findAll(query: TemplateQueryDto) {
    const { search, type, editorType, userId, isArchived, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TemplateWhereInput = {
      isArchived,
      ...(type && { type }),
      ...(editorType && { editorType }),
      ...(userId !== undefined && { userId }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { emailBody: true },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextPage: page * limit < total ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { emailBody: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    await this.findOne(id); // Throws NotFound if missing

    const { name, description, type, editorType, emailBody } = updateTemplateDto;

    return this.prisma.template.update({
      where: { id },
      data: {
        name,
        description,
        type,
        editorType,
        // Upsert or update email schema records safely
        ...(emailBody && {
          emailBody: {
            upsert: {
              create: {
                subject: emailBody.subject,
                htmlContent: emailBody.htmlContent,
                designJson: emailBody.designJson || undefined,
              },
              update: {
                subject: emailBody.subject,
                htmlContent: emailBody.htmlContent,
                designJson: emailBody.designJson || undefined,
              },
            },
          },
        }),
      },
      include: { emailBody: true },
    });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.template.update({
      where: { id },
      data: { isArchived: true },
      select: { id: true, isArchived: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const deletedFileRecords = await this.prisma.fileRecord.findMany({
      where: {
        templateId: id,
      },
      select: { id: true, storageKey: true }
    })

    // Delete all file records associated with the template
    await this.prisma.fileRecord.deleteMany({
      where: {
        templateId: id,
      },
    })
    await this.prisma.template.delete({ where: { id } });
    return { deleted: true, id, deletedFileRecords };
  }

  async createFileRecord(fileRecord: Prisma.FileRecordCreateInput) {
    return this.prisma.fileRecord.create({
      data: fileRecord,
    });
  }

  async deleteFileRecord(id: string) {
    return this.prisma.fileRecord.delete({ where: { id } });
  }
}