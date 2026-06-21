import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; 
import { CreateGroupDto } from '../dto/create-group.dto';
import { EMAIL_PROVIDER_TOKEN } from '../constants';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { GroupPaginationQueryDto } from '../dto/group-pagination-query.dto';
import { Prisma } from 'src/generated/prisma/browser';
import { LeadPaginationQueryDto } from '../dto/lead-pagination-query.dto';

@Injectable()
export class LeadGroupService {
  constructor(private readonly prisma: PrismaService, @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: IEmailProvider) {}

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
    const emailsToSync = updatedGroup.leads
      .map((l) => l.email)
      .filter((e): e is string => !!e);
      
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