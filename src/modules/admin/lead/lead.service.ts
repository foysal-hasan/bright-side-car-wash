import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { LeadSortField, QueryLeadDto, SortOrder } from './dto/query-lead.dto';
import { DepositStatus, Prisma } from 'src/generated/prisma/browser';

@Injectable()
export class LeadService {
  constructor(private prisma: PrismaService) { }
  async create(createLeadDto: CreateLeadDto) {
    // check if the stage_id exists in the stage table
    const stage = await this.prisma.stage.findUnique({
      where: { id: createLeadDto.stage_id },
      select: { id: true },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${createLeadDto.stage_id} does not exist`);
    }

    const lead = await this.prisma.lead.create({
      data: {
        name: createLeadDto.name,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        service: createLeadDto.service,
        vehicle: createLeadDto.vehicle,
        source: createLeadDto.source || 'Website',
        deposit_status: createLeadDto.deposit_status,
        notes: createLeadDto.notes || [],
        stage_id: createLeadDto.stage_id,
        created_by_user_id: createLeadDto.created_by || null,
      },
    });

    await this.prisma.leadActivityTimeline.create({
      data: {
        lead_id: lead.id,
        description: `Lead created`,
        user_id: createLeadDto.created_by || null,
        source: createLeadDto.created_source || 'Website',
      },
    });

    return lead;
  }

// ============ MAIN FIND ALL METHOD ============
  async findAll(query: QueryLeadDto) {
    const {
      // Pagination
      pagination_type = 'offset',
      page = 1,
      limit = 10,
      take = 10,
      cursor,
      
      // Exact match filters
      stage_id,
      stage_name,
      deposit_status,
      source,
      assigned_to,
      priority,
      
      // Search
      search,
      
      // Date range
      date_from,
      date_to,
      
      // Sorting
      sort_by = LeadSortField.CREATED_AT,
      sort_order = SortOrder.DESC,
    } = query;

    // Build where clause
    const where = this.buildWhereClause({
      stage_id,
      stage_name,
      deposit_status,
      source,
      assigned_to,
      priority,
      search,
      date_from,
      date_to,
    });

    // Build order by
    const orderBy = this.buildOrderBy(sort_by, sort_order);

    // Choose pagination type
    if (pagination_type === 'cursor') {
      return this.findWithCursorPagination({
        where,
        orderBy,
        take: Math.min(take || 10, 100),
        cursor,
      });
    }

    // Default: offset pagination
    return this.findWithOffsetPagination({
      where,
      orderBy,
      page: Math.max(page || 1, 1),
      limit: Math.min(limit || 10, 100),
    });
  }

  // ============ OFFSET PAGINATION ============
  private async findWithOffsetPagination({
    where,
    orderBy,
    page,
    limit,
  }: {
    where: Prisma.LeadWhereInput;
    orderBy: Prisma.LeadOrderByWithRelationInput;
    page: number;
    limit: number;
    selectClause?: Prisma.LeadSelect;
    includeClause?: Prisma.LeadInclude;
  }) {
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
        next_cursor: null,
        previous_cursor: null,
      },
    };
  }

  // ============ CURSOR PAGINATION ============
  private async findWithCursorPagination({
    where,
    orderBy,
    take,
    cursor,
    selectClause,
    includeClause,
  }: {
    where: Prisma.LeadWhereInput;
    orderBy: Prisma.LeadOrderByWithRelationInput;
    take: number;
    cursor?: string;
    selectClause?: Prisma.LeadSelect;
    includeClause?: Prisma.LeadInclude;
  }) {
    let cursorObj: Prisma.LeadWhereUniqueInput | undefined;
    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    // Decode cursor if provided
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      if (decoded) {
        cursorObj = { id: decoded };
      } else {
        throw new BadRequestException('Invalid cursor format');
      }
    }

    // Fetch data with cursor
    let data = await this.prisma.lead.findMany({
      where,
      orderBy,
      take: take + 1, // Get one extra to check for next page
      ...(cursorObj && { cursor: cursorObj }),
      skip: cursorObj ? 1 : 0, // Skip the cursor item itself
    });

    // Check if there are more items
    const hasNext = data.length > take;
    if (hasNext) {
      data = data.slice(0, take);
      const lastItem = data[data.length - 1];
      nextCursor = this.encodeCursor(lastItem.id);
    }

    // For previous page cursor
    if (cursorObj) {
      const [prevItem] = await this.prisma.lead.findMany({
        where,
        orderBy,
        take: 1,
        cursor: cursorObj,
        skip: 0,
        ...(selectClause && { select: { id: true } }),
      });

      if (prevItem) {
        previousCursor = this.encodeCursor(prevItem.id);
      }
    }

    const totalCount = await this.prisma.lead.count({ where });

    return {
      data,
      meta: {
        take: data.length,
        total_count: totalCount,
        next_cursor: nextCursor,
        previous_cursor: previousCursor,
        has_next: hasNext,
        has_previous: !!cursorObj,
        page: null,
        limit: null,
        total_pages: null,
      },
    };
  }

  // ============ WHERE CLAUSE BUILDER ============
  private buildWhereClause(filters: {
    stage_id?: string;
    stage_name?: string;
    deposit_status?: DepositStatus;
    source?: string;
    assigned_to?: string;
    priority?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    include_deleted?: boolean;
  }): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {};

    // Soft delete filter
    if (!filters.include_deleted) {
      where.deleted_at = null;
    }

    // Stage ID (exact match)
    if (filters.stage_id) {
      where.stage_id = filters.stage_id;
    }

    // Stage Name (exact match - case insensitive)
    if (filters.stage_name) {
      where.stage = {
        name: {
          equals: filters.stage_name,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      };
    }

    // Deposit Status (exact match)
    if (filters.deposit_status) {
      where.deposit_status = filters.deposit_status;
    }

    // Source (exact match - case insensitive for flexibility)
    if (filters.source) {
      where.source = {
        equals: filters.source,
        mode: 'insensitive' as Prisma.QueryMode,
      };
    }

    // TODO: Implement assigned_to and priority filters if needed
    // // Assigned To (exact match)
    // if (filters.assigned_to) {
    //   where.assigned_to = filters.assigned_to;
    // }

    // TODO: Implement priority filter if needed
    // // Priority (exact match)
    // if (filters.priority) {
    //   where.priority = filters.priority;
    // }

    // Search (partial match across multiple fields)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { phone: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { service: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { vehicle: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { notes: { has: searchTerm } },
        {
          stage: {
            name: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode },
          },
        },
      ];
    }

    // Date range
    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) {
        const fromDate = new Date(filters.date_from);
        if (isNaN(fromDate.getTime())) {
          throw new BadRequestException('Invalid date_from format');
        }
        where.created_at.gte = fromDate;
      }
      if (filters.date_to) {
        const toDate = new Date(filters.date_to);
        if (isNaN(toDate.getTime())) {
          throw new BadRequestException('Invalid date_to format');
        }
        where.created_at.lte = toDate;
      }
    }

    return where;
  }

  // ============ ORDER BY BUILDER ============
  private buildOrderBy(
    sortBy: LeadSortField,
    sortOrder: SortOrder,
  ): Prisma.LeadOrderByWithRelationInput {
    const order: Prisma.LeadOrderByWithRelationInput = {};

    switch (sortBy) {
      case LeadSortField.CREATED_AT:
        order.created_at = sortOrder;
        break;
      case LeadSortField.UPDATED_AT:
        order.updated_at = sortOrder;
        break;
      case LeadSortField.NAME:
        order.name = sortOrder;
        break;
      case LeadSortField.EMAIL:
        order.email = sortOrder;
        break;
      case LeadSortField.DEPOSIT_STATUS:
        order.deposit_status = sortOrder;
        break;
      case LeadSortField.STAGE:
        order.stage_id = sortOrder;
        break;
      case LeadSortField.SOURCE:
        order.source = sortOrder;
        break;
      default:
        order.created_at = 'desc';
    }

    // Add secondary sort for consistency
    if (sortBy !== LeadSortField.CREATED_AT) {
      order.created_at = 'desc';
    }

    return order;
  }

  // ============ SELECT CLAUSE BUILDER ============
  private buildSelectClause(select?: string[]): Prisma.LeadSelect | undefined {
    if (!select || select.length === 0) return undefined;

    const selectObj: Prisma.LeadSelect = {};
    const allowedFields = [
      'id',
      'created_at',
      'updated_at',
      'deleted_at',
      'name',
      'email',
      'phone',
      'service',
      'vehicle',
      'source',
      'deposit_status',
      'notes',
      'stage_id',
      'assigned_to',
      'priority',
      'budget',
    ];

    select.forEach((field) => {
      if (allowedFields.includes(field)) {
        selectObj[field] = true;
      }
    });

    return Object.keys(selectObj).length > 0 ? selectObj : undefined;
  }

  // ============ INCLUDE CLAUSE BUILDER ============
  private buildIncludeClause(include?: string[]): Prisma.LeadInclude | undefined {
    if (!include || include.length === 0) return undefined;

    const includeObj: Prisma.LeadInclude = {};

    if (include.includes('stage')) {
      includeObj.stage = true;
    }

    // if (include.includes('activities')) {
    //   includeObj.activities = {
    //     orderBy: { created_at: 'desc' },
    //     take: 10,
    //   };
    // }

    // if (include.includes('assigned_to') || include.includes('user')) {
    //   includeObj.assigned_to_user = {
    //     select: {
    //       id: true,
    //       name: true,
    //       email: true,
    //     },
    //   };
    // }

    if (include.includes('notes')) {
      // Notes are already included by default
    }

    return Object.keys(includeObj).length > 0 ? includeObj : undefined;
  }

  // ============ CURSOR ENCODING/DECODING ============
  private encodeCursor(id: string): string {
    return Buffer.from(JSON.stringify({ id })).toString('base64');
  }

  private decodeCursor(cursor: string): string | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return parsed.id || null;
    } catch (error) {
      return null;
    }
  }

  // ============ GET FILTER OPTIONS ============
  async getFilterOptions() {
    const [stages, depositStatuses, sources] = await Promise.all([
      this.prisma.stage.findMany({
        select: {
          id: true,
          name: true,
        },
        where: { deleted_at: null },
      }),
      this.prisma.lead.groupBy({
        by: ['deposit_status'],
        _count: true,
        where: { deleted_at: null },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        _count: true,
        where: { deleted_at: null },
      }),
    ]);

    return {
      stages,
      deposit_statuses: depositStatuses.map((item) => ({
        status: item.deposit_status,
        count: item._count,
      })),
      sources: sources.map((item) => ({
        source: item.source,
        count: item._count,
      })),
    };
  }

  // ============ GET STAGES WITH COUNTS ============
  async getStagesWithCounts() {
    const stages = await this.prisma.stage.findMany({
      include: {
        _count: {
          select: { leads: true },
        },
      },
      where: { deleted_at: null },
    });

    return stages.map((stage) => ({
      ...stage,
      lead_count: stage._count.leads,
    }));
  }



  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        created_by_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            sort_order: true,
          },
        },
        activity_timelines: {
          select: {
            id: true,
            description: true,
            created_at: true,
            user_id: true,
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
            source: true,
          },
        },
      },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} does not exist`);
    }
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto) {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateLeadDto,
    });

    return lead;
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.delete({
      where: { id },
    });
    return lead;
  }
}
