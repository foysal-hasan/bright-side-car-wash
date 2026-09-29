import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { EMAIL_PROVIDER_TOKEN } from '../constants';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { GroupPaginationQueryDto } from '../dto/group-pagination-query.dto';
import { Prisma } from 'src/generated/prisma/browser';
import { LeadPaginationQueryDto } from '../dto/lead-pagination-query.dto';
import { NonGroupLeadPaginationQueryDto } from '../dto/non-group-lead-pagination-query.dto';
import { Response } from 'express';
import { ExportFormat, ExportLeadGroupDto } from '../dto/export-lead-group.dto';

@Injectable()
export class LeadGroupService {
  constructor(private readonly prisma: PrismaService, @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: IEmailProvider) { }

  async createGroup(createGroupDto: CreateGroupDto) {
    const { name, description } = createGroupDto;
    // Register list in Brevo first to get the remote ID
    const brevoListId = await this.emailProvider.createRemoteList(name);

    return this.prisma.leadGroup.create({
      data: { name, description, brevoListId },
    });
  }

  async addLeadsToGroup(groupId: string, leadIds: string[]) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || !group.brevoListId) {
      throw new NotFoundException('Lead Group or linked Brevo list not found.');
    }

    // Connect them in Prisma
    const updatedGroup = await this.prisma.leadGroup.update({
      where: { id: groupId },
      data: {
        leads: { connect: leadIds.map((id) => ({ id })) },
      },
      include: { leads: { where: { id: { in: leadIds } } } },
    });

    // Extract emails and push them to Brevo instantly
    // const emailsToSync = updatedGroup.leads
    //   .map((l) => l.email)
    //   .filter((e): e is string => !!e);
    const emailsToSync = updatedGroup.leads
      .map((l) => {
        let firstName = 'Valued Customer';
        let lastName = '';

        if (l?.name?.split?.(' ')?.[0]) {
          firstName = l.name.split(' ')[0];
        }

        if (l?.name?.split?.(' ')?.[1]) {
          lastName = l.name.split(' ')[1];
        }

        return {
          email: l.email,
          firstName,
          lastName
        }
      }
      )
      .filter((c): c is { email: string; firstName: string; lastName: string } => !!c.email);

    if (emailsToSync.length > 0) {
      await this.emailProvider.addContactsToList(group.brevoListId, emailsToSync);
    }

    return updatedGroup;
  }

  async removeLeadsFromGroup(groupId: string, leadIds: string[]) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
      include: { leads: { where: { id: { in: leadIds } } } },
    });

    if (!group || !group.brevoListId) {
      throw new NotFoundException('Lead Group or linked Brevo list not found.');
    }

    const emailsToRemove = group.leads
      .map((l) => l.email)
      .filter((e): e is string => !!e);

    // Remove from Brevo list instantly
    if (emailsToRemove.length > 0) {
      await this.emailProvider.removeContactsFromList(group.brevoListId, emailsToRemove);
    }


    // Disconnect locally
    const updatedGroup = await this.prisma.leadGroup.update({
      where: { id: groupId },
      data: {
        leads: { disconnect: leadIds.map((id) => ({ id })) },
      },
    });



    return updatedGroup;
  }

  async exportGroupLeadsStream(groupId: string, query: ExportLeadGroupDto, res: Response) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new NotFoundException(`Lead Group with ID "${groupId}" not found.`);
    }

    const take = 10000;
    let skip = 0;
    let hasMore = true;

    const filename = `lead_group_${group.name}_${Date.now()}.${query.format === ExportFormat.CSV ? 'csv' : 'xlsx'}`;

    if (query.format === ExportFormat.EXCEL) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: false,
        useSharedStrings: false
      });
      
      const worksheet = workbook.addWorksheet('Leads Export');
      worksheet.columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Service', key: 'service' },
        { header: 'Source', key: 'source' },
        { header: 'Stage', key: 'stage' },
        { header: 'Priority', key: 'priority' },
        { header: 'Created At', key: 'createdAt' },
      ];

      while (hasMore) {
        const groupBatch = await this.prisma.leadGroup.findUnique({
          where: { id: groupId },
          include: {
            leads: {
              take,
              skip,
              include: {
                stage: { select: { name: true } },
              },
            },
          },
        });

        if (!groupBatch || groupBatch.leads.length === 0) {
          hasMore = false;
          break;
        }

        for (const lead of groupBatch.leads) {
          worksheet.addRow({
            id: lead.id,
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            service: lead.service || '',
            source: lead.source || '',
            stage: lead.stage?.name || 'N/A',
            priority: lead.priority || 'LOW',
            createdAt: lead.created_at.toISOString(),
          }).commit();
        }

        skip += take;
      }

      worksheet.commit();
      await workbook.commit();
      
    } else if (query.format === ExportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.write('ID,Name,Email,Phone,Service,Source,Stage,Priority,Created At\n');
      
      while (hasMore) {
        const groupBatch = await this.prisma.leadGroup.findUnique({
          where: { id: groupId },
          include: {
            leads: {
              take,
              skip,
              include: {
                stage: { select: { name: true } },
              },
            },
          },
        });

        if (!groupBatch || groupBatch.leads.length === 0) {
          hasMore = false;
          break;
        }

        for (const lead of groupBatch.leads) {
          const row = [
            lead.id,
            `"${(lead.name || '').replace(/"/g, '""')}"`,
            `"${(lead.email || '').replace(/"/g, '""')}"`,
            `"${(lead.phone || '').replace(/"/g, '""')}"`,
            `"${(lead.service || '').replace(/"/g, '""')}"`,
            `"${(lead.source || '').replace(/"/g, '""')}"`,
            `"${(lead.stage?.name || 'N/A').replace(/"/g, '""')}"`,
            `"${(lead.priority || 'LOW').replace(/"/g, '""')}"`,
            `"${lead.created_at.toISOString()}"`
          ];
          res.write(row.join(',') + '\n');
        }

        skip += take;
      }
      res.end();
    } else {
      throw new BadRequestException('Unsupported export file format requested.');
    }
  }

  async getGroups(query: GroupPaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search?.trim();

    const skip = (page - 1) * limit;

    // 1. Dynamically compile the database filter object
    const whereClause: Prisma.LeadGroupWhereInput = search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {};

    // 2. Fetch total count matching conditions and matching subset in parallel
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.leadGroup.count({ where: whereClause }),
      this.prisma.leadGroup.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          _count: {
            select: { leads: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

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

  async deleteGroup(groupId: string) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) throw new NotFoundException('Group not found.');

    // Remove from Brevo if an ID exists
    if (group.brevoListId) {
      await this.emailProvider.deleteRemoteList(group.brevoListId);
    }

    // Delete locally
    await this.prisma.leadGroup.delete({
      where: { id: groupId },
    });

    return null;
  }

  async getGroupDetails(groupId: string) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { leads: true }, // Returns total member count instantly
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Lead Group with ID "${groupId}" not found.`);
    }

    return group;
  }


  async getGroupLeads(groupId: string, query: LeadPaginationQueryDto) {
    // Verify group existence first
    const groupExists = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!groupExists) {
      throw new NotFoundException(`Lead Group with ID "${groupId}" not found.`);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    // Filter condition specifically targetting this group's relations
    const baseWhereCondition: Prisma.LeadWhereInput = {
      leadGroups: {
        some: { id: groupId },
      },
    };

    if (search) {
      baseWhereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Process parallel query sets
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: baseWhereCondition }),
      this.prisma.lead.findMany({
        where: baseWhereCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

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

  async getNonGroupLeads(groupId: string, query: NonGroupLeadPaginationQueryDto) {
    // Verify group existence first
    const groupExists = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!groupExists) {
      throw new NotFoundException(`Lead Group with ID "${groupId}" not found.`);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    // Filter condition specifically targetting leads NOT in this group
    const baseWhereCondition: Prisma.LeadWhereInput = {
      NOT: {
        leadGroups: {
          some: { id: groupId },
        },
      },
    };

    if (search) {
      baseWhereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Process parallel query sets
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: baseWhereCondition }),
      this.prisma.lead.findMany({
        where: baseWhereCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

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
}

