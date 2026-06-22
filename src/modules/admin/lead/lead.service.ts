import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { LeadSortField, QueryLeadDto, SortOrder } from './dto/query-lead.dto';
import { DepositStatus, LeadPriority, Prisma } from 'src/generated/prisma/browser';
import { AssignLeadDto } from './dto/assign-lead.dto';
import * as XLSX from 'xlsx';
import { ExportFormat, ExportLeadDto } from './dto/export-lead.dto';

@Injectable()
export class LeadService {
  constructor(private prisma: PrismaService) { }
  async create(createLeadDto: CreateLeadDto) {
    // check if the stage_id exists in the stage table
    const stage = await this.prisma.stage.findFirst({
      where: { name: createLeadDto.stage_name },
      select: { id: true, name: true },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with name ${createLeadDto.stage_name} does not exist`);
    }

    const lead = await this.prisma.lead.create({
      data: {
        name: createLeadDto.name,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        service: createLeadDto.service,
        vehicle: createLeadDto.vehicle,
        source: createLeadDto.source || 'Website',
        deposit_status: createLeadDto.deposit_status || DepositStatus.PENDING,
        priority: createLeadDto.priority || LeadPriority.LOW,
        notes: createLeadDto.notes || [],
        // ...(createLeadDto.created_by && { created_by_id: createLeadDto.created_by }),
        stage: {
          connect: { id: stage.id },
        },
        creator: {
          connect: createLeadDto.created_by ? { id: createLeadDto.created_by } : undefined,
        },
        attachments: createLeadDto.attachments || [],
      },
      include: {
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        }
      }
    });

    await this.prisma.leadActivityTimeline.create({
      data: {
        lead_id: lead.id,
        description: `Lead created`,
        user_id: createLeadDto.created_by || null,
        source: createLeadDto.created_source || 'Website',
      },
    });

    if (lead.assigned_to_id) {
      await this.prisma.leadAssignmentHistory.create({
        data: {
          lead_id: lead.id,
          description: `Lead created and Assigned to ${lead.assignee.first_name} ${lead.assignee.last_name}`,
          user_id: createLeadDto.created_by || null,
          source: createLeadDto.created_source || 'Website',
        },
      });
    }

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
      assigned_to_id,
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
      assigned_to_id,
      priority,
      search,
      date_from,
      date_to,
    });

    // Build order by
    const orderBy = this.buildOrderBy(sort_by, sort_order);
    const includeClause = this.buildIncludeClause();

    // Choose pagination type
    if (pagination_type === 'cursor') {
      return this.findWithCursorPagination({
        where,
        orderBy,
        take: Math.min(take || 10, 100),
        cursor,
        includeClause,
      });
    }

    // Default: offset pagination
    return this.findWithOffsetPagination({
      where,
      orderBy,
      includeClause,
      page: Math.max(page || 1, 1),
      limit: Math.min(limit || 10, 100),
    });
  }

  async exportLeadsToBuffer(query: ExportLeadDto) {
    // 1. Compile filters using your existing where clause builder framework
    // (Replace `this.buildWhereClause` with your service's structural path reference)
    const { sort_by, sort_order } = query;
    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderBy(sort_by, sort_order);

    // 2. Fetch all matching leads from DB
    const leads = await this.prisma.lead.findMany({
      where,
      orderBy,
      include: {
        stage: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });

    // 3. Flatten complex database models into table spreadsheet columns
    const flattenedRows = leads.map((lead) => ({
      ID: lead.id,
      Name: lead.name || '',
      Email: lead.email || '',
      Phone: lead.phone || '',
      Service: lead.service || '',
      Vehicle: lead.vehicle || '',
      Source: lead.source || '',
      Stage: lead.stage?.name || 'N/A',
      'Deposit Status': lead.deposit_status || 'PENDING',
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
      return { buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
    } else if (query.format === ExportFormat.CSV) {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
      return { buffer, mimeType: 'text/csv', extension: 'csv',  };
    }

    throw new BadRequestException('Unsupported export file format requested.');
  }

  // ============ OFFSET PAGINATION ============
  private async findWithOffsetPagination({
    where,
    orderBy,
    page,
    limit,
    selectClause,
    includeClause,
  }: {
    where: Prisma.LeadWhereInput;
    orderBy: Prisma.LeadOrderByWithRelationInput[];
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
        include: includeClause,
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
    orderBy: Prisma.LeadOrderByWithRelationInput[];
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
      include: includeClause,
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
        select: { id: true },
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
    assigned_to_id?: string;
    priority?: LeadPriority;
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


    // Assigned To (exact match)
    if (filters.assigned_to_id) {
      where.assigned_to_id = filters.assigned_to_id;
    }


    // Priority (exact match)
    if (filters.priority) {
      where.priority = filters.priority;
    }

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
  ): Prisma.LeadOrderByWithRelationInput[] {
    const order: Prisma.LeadOrderByWithRelationInput[] = [];

    // Push the primary sort criteria
    switch (sortBy) {
      case LeadSortField.CREATED_AT:
        order.push({ created_at: sortOrder });
        break;
      case LeadSortField.UPDATED_AT:
        order.push({ updated_at: sortOrder });
        break;
      case LeadSortField.NAME:
        order.push({ name: sortOrder });
        break;
      case LeadSortField.EMAIL:
        order.push({ email: sortOrder });
        break;
      case LeadSortField.DEPOSIT_STATUS:
        order.push({ deposit_status: sortOrder });
        break;
      case LeadSortField.SOURCE:
        order.push({ source: sortOrder });
        break;
      default:
        order.push({ created_at: 'desc' });
    }

    // Add secondary sort for consistency if it's not already the primary
    if (sortBy !== LeadSortField.CREATED_AT) {
      order.push({ created_at: 'desc' });
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
  private buildIncludeClause(): Prisma.LeadInclude | undefined {
    const includeObj: Prisma.LeadInclude = {
      stage: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },

    };
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
    const [stages, depositStatuses, sources, priorities] = await Promise.all([
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
      this.prisma.lead.groupBy({
        by: ['priority'],
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
      priorities: priorities.map((item) => ({
        priority: item.priority,
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
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
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
        assignment_history: {
          select: {
            id: true,
            description: true,
            source: true,
            assigned_to_id: true,
            assigned_to: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
            assigned_by_id: true,
            assigned_by: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
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
    // 1. Verify the lead exists and fetch current values for comparison
    const existingLead = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        stage_id: true,
        assigned_to_id: true,
        email: true,
        phone: true,
        service: true,
        vehicle: true,
        source: true,
        deposit_status: true,
        priority: true,
      },
    });

    if (!existingLead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Common metadata for timeline entries
    const userId = updateLeadDto.updated_by || null;
    const updateSource = updateLeadDto.updated_source || 'Admin Panel';

    // 2. Execute everything atomically in a transaction
    return await this.prisma.$transaction(async (tx) => {
      const data: Prisma.LeadUpdateInput = {};
      const timelinePayloads: Prisma.LeadActivityTimelineCreateManyInput[] = [];
      const minorFieldsChanged: string[] = [];

      // --- CRITICAL FIELD: Name Change ---
      if (updateLeadDto.name !== undefined && updateLeadDto.name !== existingLead.name) {
        data.name = updateLeadDto.name;
        timelinePayloads.push({
          lead_id: id,
          description: `Name changed from "${existingLead.name}" to "${updateLeadDto.name}"`,
          user_id: userId,
          source: updateSource,
        });
      }

      // --- CRITICAL FIELD: Stage Change ---
      if (updateLeadDto.stage_name !== undefined && updateLeadDto.stage_name !== existingLead.name) {
        const stage = await tx.stage.findFirst({
          where: { name: updateLeadDto.stage_name },
          select: { id: true, name: true },
        });
        if (!stage) {
          throw new NotFoundException(`Stage with name ${updateLeadDto.stage_name} does not exist`);
        }

        data.stage = { connect: { id: stage.id } };
        const formattedStageName = stage.name.charAt(0).toUpperCase() + stage.name.slice(1).toLowerCase();

        timelinePayloads.push({
          lead_id: id,
          description: `Stage updated to: ${formattedStageName}`,
          user_id: userId,
          source: updateSource,
        });
      }

      // --- QUIET / STRUCTURAL FIELDS: Track changes but group them together ---
      if (updateLeadDto.email !== undefined && updateLeadDto.email !== existingLead.email) {
        data.email = updateLeadDto.email;
        minorFieldsChanged.push('email');
      }
      if (updateLeadDto.phone !== undefined && updateLeadDto.phone !== existingLead.phone) {
        data.phone = updateLeadDto.phone;
        minorFieldsChanged.push('phone');
      }
      if (updateLeadDto.service !== undefined && updateLeadDto.service !== existingLead.service) {
        data.service = updateLeadDto.service;
        minorFieldsChanged.push('service');
      }
      if (updateLeadDto.vehicle !== undefined && updateLeadDto.vehicle !== existingLead.vehicle) {
        data.vehicle = updateLeadDto.vehicle;
        minorFieldsChanged.push('vehicle');
      }
      if (updateLeadDto.source !== undefined && updateLeadDto.source !== existingLead.source) {
        data.source = updateLeadDto.source;
        minorFieldsChanged.push('source');
      }
      if (updateLeadDto.deposit_status !== undefined && updateLeadDto.deposit_status !== existingLead.deposit_status) {
        data.deposit_status = updateLeadDto.deposit_status;
        minorFieldsChanged.push('deposit status');
      }
      if (updateLeadDto.priority !== undefined && updateLeadDto.priority !== existingLead.priority) {
        data.priority = updateLeadDto.priority;
        minorFieldsChanged.push('priority');
      }
      if (updateLeadDto.notes !== undefined) {
        data.notes = updateLeadDto.notes;
        minorFieldsChanged.push('notes');
      }
      if (updateLeadDto.attachments !== undefined) {
        data.attachments = updateLeadDto.attachments;
        minorFieldsChanged.push('attachments');
      }

      // If any of the structural fields changed, push ONE summarized timeline log
      if (minorFieldsChanged.length > 0) {
        timelinePayloads.push({
          lead_id: id,
          description: `Updated profile details (${minorFieldsChanged.join(', ')})`,
          user_id: userId,
          source: updateSource,
        });
      }

      // 3. Performance boost: Batch insert all collected timeline items at once
      if (timelinePayloads.length > 0) {
        await tx.leadActivityTimeline.createMany({
          data: timelinePayloads,
        });
      }

      // 4. Update and return the final Lead record
      return await tx.lead.update({
        where: { id },
        data: data,
      });
    });
  }

  async assignLead(id: string, assignLeadDto: AssignLeadDto) {
    // 1. Fetch current assignment status to prevent duplicate log actions
    const existingLead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, assigned_to_id: true },
    });

    if (!existingLead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }


    if (existingLead.assigned_to_id === assignLeadDto.assigned_to_id) {
      throw new BadRequestException(`Lead is already assigned to the specified user`);
    }


    const updateSource = assignLeadDto.assignment_source || 'Admin Panel';

    // 2. Wrap operations in an atomic transaction
    return await this.prisma.$transaction(async (tx) => {
      // Update the main Lead record
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          assigned_to_id: assignLeadDto.assigned_to_id,
        },
        select: {
          id: true,
          assignee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          }
        },
      });

      // Log to dedicated LeadAssignmentHistory table
      await tx.leadAssignmentHistory.create({
        data: {
          lead_id: id,
          description: `Lead ${assignLeadDto.assigned_to_id ? 'assigned' : 'unassigned'} to ${updatedLead.assignee ? `${updatedLead.assignee.first_name} ${updatedLead.assignee.last_name}` : 'N/A'}`,
          assigned_to_id: assignLeadDto.assigned_to_id || null,
          assigned_by_id: assignLeadDto.assigned_by_id || null,
        },
      });

      // Log to general LeadActivityTimeline
      await tx.leadActivityTimeline.create({
        data: {
          lead_id: id,
          description: assignLeadDto.assigned_to_id
            ? `Lead assigned`
            : `Lead unassigned`,
          user_id: assignLeadDto.assigned_to_id || null,
          source: updateSource,
        },
      });
      return updatedLead;
    });
  }

  async remove(id: string) {
    await this.prisma.lead.delete({
      where: { id },
    });
    return null;
  }

  async importLeads(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file upload payload. File buffer is empty.');
    }

    // 1. Read file buffer straight from RAM memory
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // 2. Convert spreadsheet layouts to raw row JSON data blocks
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    // --- OPTIMIZATION: Fetch all stages upfront to eliminate N+1 database queries ---
    const allStages = await this.prisma.stage.findMany({ select: { id: true, name: true } });

    // Target array container for safe, fully validated records
    const validatedLeadsToCreate: any[] = [];

    // must present in row
    const requiredFields = ['name', 'email'];

    // =========================================================================
    // PASS 1: PARSING & VALIDATION LOOP (Pure In-Memory Operations)
    // =========================================================================
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Row number context matching Excel row layouts visually

      // Normalize header keys to lowercase
      const normalizedRow: Record<string, string> = {};
      Object.keys(row).forEach((key) => {
        normalizedRow[key.toLowerCase().trim()] = String(row[key]).trim();
      });

      const email = normalizedRow['email'];
      const name = normalizedRow['name'] || undefined;


      // 1. Find any fields from your required array that are missing or blank
      const missingFields = requiredFields.filter(
        (field) => !normalizedRow[field] || normalizedRow[field].trim() === ''
      );

      // 2. If any fields are trapped in the missing array, reject the file immediately
      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Row ${rowNumber} validation failed: The following required parameters are missing or empty: ${missingFields.join(', ')}`
        );
      }

      const phone = normalizedRow['phone'] || normalizedRow['phone number'] || null;
      const service = normalizedRow['service'] || null;
      const vehicle = normalizedRow['vehicle'] || null;
      const source = normalizedRow['source'] || 'Spreadsheet Import';
      const stageName = normalizedRow['stage'] || normalizedRow['stage name'];

      // --- 1. Stage Lookup (In-Memory array matching) ---
      if (!stageName) {
        throw new BadRequestException(`Row ${rowNumber} validation failed: 'stage' column property is missing or empty.`);
      }

      const matchedStage = allStages.find(
        (s) => s.name.toLowerCase().trim() === stageName.toLowerCase().trim()
      );

      if (!matchedStage) {
        throw new NotFoundException(
          `Row ${rowNumber} validation failed: Stage "${stageName}" does not exist. Please create this pipeline stage configuration before importing.`
        );
      }

      // --- 2. Deposit Status Validation ---
      let depositStatus: DepositStatus = DepositStatus.PENDING;
      const rawDeposit = normalizedRow['deposit_status'] || normalizedRow['deposit status'];

      if (rawDeposit) {
        const normalizedDeposit = rawDeposit.toUpperCase().trim();
        if (!Object.values(DepositStatus).includes(normalizedDeposit as DepositStatus)) {
          throw new BadRequestException(
            `Row ${rowNumber} validation failed: "${rawDeposit}" is an invalid deposit status. Allowed values: ${Object.values(DepositStatus).join(', ')}`
          );
        }
        depositStatus = normalizedDeposit as DepositStatus;
      }

      // --- 3. Priority Validation ---
      let priority: LeadPriority = LeadPriority.LOW;
      const rawPriority = normalizedRow['priority'];

      if (rawPriority) {
        const normalizedPriority = rawPriority.toUpperCase().trim();
        if (!Object.values(LeadPriority).includes(normalizedPriority as LeadPriority)) {
          throw new BadRequestException(
            `Row ${rowNumber} validation failed: "${rawPriority}" is an invalid priority value. Allowed values: ${Object.values(LeadPriority).join(', ')}`
          );
        }
        priority = normalizedPriority as LeadPriority;
      }

      // Record is clean, append it to the bulk processing array pipeline
      validatedLeadsToCreate.push({
        name,
        email,
        phone,
        service,
        vehicle,
        source,
        stage_id: matchedStage.id,
        deposit_status: depositStatus,
        priority: priority,
      });
    }

    // =========================================================================
    // PASS 2: DATABASE WRITE LOOP (Guaranteed Safe Operations)
    // =========================================================================
    let processedCount = 0;

    for (const leadData of validatedLeadsToCreate) {
      // Use upsert or create depending on your requirement. Here we stick with your 'create' workflow safely.
      await this.prisma.lead.create({
        data: leadData,
      });
      processedCount++;
    }

    return {
      success: true,
      totalRowsFound: rawRows.length,
      successfullyProcessed: processedCount,
    };
  }
}
