import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { EMAIL_PROVIDER_TOKEN } from '../constants';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { GroupPaginationQueryDto } from '../dto/group-pagination-query.dto';
import { Prisma } from 'src/generated/prisma/browser';
import { LeadPaginationQueryDto } from '../dto/lead-pagination-query.dto';
import * as XLSX from 'xlsx';
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

  async exportGroupLeadsToBuffer(groupId: string, query: ExportLeadGroupDto) {
    const group = await this.prisma.leadGroup.findUnique({
      where: { id: groupId },
      include: {
        leads: {
          include: {
            stage: { select: { name: true } },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Lead Group with ID "${groupId}" not found.`);
    }

    // 3. Flatten complex database models into table spreadsheet columns
    const flattenedRows = group.leads.map((lead) => ({
      ID: lead.id,
      Name: lead.name || '',
      Email: lead.email || '',
      Phone: lead.phone || '',
      Service: lead.service || '',
      // Vehicle: lead.vehicle || '',
      Source: lead.source || '',
      Stage: lead.stage?.name || 'N/A',
      // 'Deposit Status': lead.deposit_status || 'PENDING',
      Priority: lead.priority || 'LOW',
      'Created At': lead.created_at.toISOString(),
    }));

    // 4. Generate worksheet structures via SheetJS
    const worksheet = XLSX.utils.json_to_sheet(flattenedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Export');

    // 5. Compile sheet layouts down to binary buffers matching requested formats
    if (query.format === ExportFormat.EXCEL) {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return { buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', groupName: group.name };
    } else if (query.format === ExportFormat.CSV) {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
      return { buffer, mimeType: 'text/csv', extension: 'csv', groupName: group.name };
    }

    throw new BadRequestException('Unsupported export file format requested.');
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
}


