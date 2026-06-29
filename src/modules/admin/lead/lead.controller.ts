import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, Req, Query, UploadedFiles, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpStatus, BadRequestException, Res, SetMetadata, HttpCode } from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { Request, Response } from 'express';
import { MyQueryLeadDto, QueryLeadDto } from './dto/query-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { extname } from 'path/win32';
import appConfig from 'src/config/app.config';
import { SpreadsheetUploadDto } from './dto/spreadsheet-upload.dto';
import { ExportLeadDto } from './dto/export-lead.dto';
import { OnlyApiTags } from 'src/common/decorator/only-api-tag.decorator';
import { UnassignLeadDto } from './dto/unassign-lead.dto';



@ApiTags('Admin Lead Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('lead')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) { }

  @ApiOperation({ summary: 'Create a new lead' })
  @ApiBody({ type: CreateLeadDto })
  @ApiConsumes('multipart/form-data')
  @LogActivity({ action: 'create', entity: 'lead' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
          if (
            file.fieldname === 'files' &&
            (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf')
          ) {
            return cb(new Error('Files should be images or PDFs'), false);
          }

          // check file size (max 25MB)
          if (file.size > 25 * 1024 * 1024) {
            return cb(new Error('File size should not exceed 25MB'), false);
          }
          cb(null, true);
        },
      },
    ),
  )
  @Post()
  async create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request, @UploadedFiles() files: { files?: Express.Multer.File[] }) {
    try {
      // Handle file uploads and store file paths in the database
      files.files?.forEach(async file => {
        const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
        const key = `${appConfig().storageUrl.lead}${generatedFilename}`;
        await SojebStorage.put(key, file.buffer);
        createLeadDto.attachments.push(generatedFilename);
      });


      createLeadDto.created_by = req.user?.userId;
      createLeadDto.created_source = 'user';
      createLeadDto.source = createLeadDto.source || 'Admin Panel';
      const result = await this.leadService.create(createLeadDto);

      result.attachments = result.attachments?.map(filename => {
        const key = `${appConfig().storageUrl.lead}${filename}`;
        return SojebStorage.url(key);
      });

      return {
        success: true,
        message: 'Lead created successfully',
        data: result,
      }
    } catch (error) {
      // Clean up any uploaded files if an error occurs
      if (createLeadDto.attachments) {
        for (const filename of createLeadDto.attachments) {
          const key = `${appConfig().storageUrl.lead}${filename}`;
          await SojebStorage.delete(key);
        }
      }
      throw error;
    }
  }

  @Post('import')
  @RequirePermission('lead:import')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Only CSV and Excel files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  @ApiOperation({
    summary: 'Bulk import leads from a spreadsheet file',
    description: 'Uploads a CSV or Excel (.xlsx/.xls) file to batch-import or update lead records. Rows are automatically upserted based on their email address.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multipart form-data structure containing the file payload data.',
    type: SpreadsheetUploadDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The file was successfully processed and the leads have been integrated/upserted.',
  })
  async importLeads(
    @UploadedFile("file")
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please attach a CSV or Excel file.');
    }
    const result = await this.leadService.importLeads(file);
    return {
      success: true,
      message: 'Leads imported successfully',
      data: result,
    };
  }


  @Get('export')
  @RequirePermission('lead:export')
  @ApiOperation({
    summary: 'Export filtered leads to Excel or CSV file download',
    description: 'Generates and downloads a spreadsheet containing all leads matching the provided query filter combinations.'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'File download stream initiated successfully.' })
  async exportLeads(
    @Query() query: ExportLeadDto,
    @Res() res: Response
  ) {
    const { buffer, mimeType, extension } = await this.leadService.exportLeadsToBuffer(query);
    
    const filename = `leads_export_${Date.now()}.${extension}`;

    // Set standard browser content headers to trigger immediate download windows
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send binary buffer directly down the pipeline stream connection
    return res.end(buffer);
  }

  @OnlyApiTags('Admin Dashboard Analytics Overview')
  @Get('metrics')
  @ApiOperation({ 
    summary: 'Fetch full analytical dataset summaries for widgets',
    description: 'Returns real-time aggregated system KPI cards, rolling line chart trend arrays, and status color mappings.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard metrics consolidated successfully.',
  })
  async getPerformanceMetrics() {
    const result = await this.leadService.getDashboardSummary();
    return {
      success: true,
      message: 'Dashboard metrics retrieved successfully',
      data: result,
    };
  }


  @Get()
  @ApiOperation({
    summary: 'Retrieve all leads with filtering, search, and pagination',
    description: `
      Supports:
      - **Exact match filters**: stage_id, deposit_status, source, assigned_to
      - **Search**: Partial text search across name, email, phone, service, vehicle, and notes
      - **Pagination**: Both offset and cursor-based pagination
      - **Sorting**: Multiple sort fields with asc/desc order
      - **Date range filtering**: Filter by created_at date range
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Leads retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @LogActivity({ action: 'read', entity: 'lead' })
  async findAll(@Query() query: QueryLeadDto) {
    const result = await this.leadService.findAll(query);

    result.data.forEach(lead => {
      lead.attachments = lead.attachments?.map(filename => {
        const key = `${appConfig().storageUrl.lead}${filename}`;
        return SojebStorage.url(key);
      });
    });
    return {
      success: true,
      message: 'Leads retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }


  @Get('assigned-to-me')
  @ApiOperation({
    summary: 'Retrieve all leads assigned to the current user with filtering, search, and pagination',
    description: `
      Supports:
      - **Exact match filters**: stage_id, deposit_status, source
      - **Search**: Partial text search across name, email, phone, service, vehicle, and notes
      - **Pagination**: Both offset and cursor-based pagination
      - **Sorting**: Multiple sort fields with asc/desc order
      - **Date range filtering**: Filter by created_at date range
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Leads retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @LogActivity({ action: 'read', entity: 'lead' })
  async findAllAssignedToMe(@Query() query: MyQueryLeadDto, @Req() req: Request) {
    query.assigned_to_id = req.user?.userId;
    const result = await this.leadService.findAll(query);

    result.data.forEach(lead => {
      lead.attachments = lead.attachments?.map(filename => {
        const key = `${appConfig().storageUrl.lead}${filename}`;
        return SojebStorage.url(key);
      });
    });

    return {
      success: true,
      message: 'Leads retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }



  @Get('filter-options')
  @ApiOperation({
    summary: 'Get available filter options with counts',
  })
  async getFilterOptions() {
    const options = await this.leadService.getFilterOptions();
    return {
      success: true,
      data: options,
    };
  }

  @Get('stages')
  @ApiOperation({ summary: 'Get all stages with lead counts' })
  async getStagesWithCounts() {
    const stages = await this.leadService.getStagesWithCounts();
    stages.forEach(stage => {
        const key = `${appConfig().storageUrl.stage}${stage.icon}`;
        stage.icon = stage.icon? SojebStorage.url(key) : null;
    });
    return {
      success: true,
      data: stages,
    };
  }


  @ApiOperation({ summary: 'Retrieve a lead by ID' })
  @LogActivity({ action: 'read', entity: 'lead' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lead = await this.leadService.findOne(id);
    lead.attachments = lead.attachments?.map(filename => {
      const key = `${appConfig().storageUrl.lead}${filename}`;
      return SojebStorage.url(key);
    });
    return {
      success: true,
      message: 'Lead retrieved successfully',
      data: lead,
    };
  }

  @ApiOperation({ summary: 'Update a lead by ID' })
  @ApiBody({ type: UpdateLeadDto })
  @ApiConsumes('multipart/form-data')
  @LogActivity({ action: 'update', entity: 'lead' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
          if (
            file.fieldname === 'files' &&
            (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf')
          ) {
            return cb(new Error('Files should be images or PDFs'), false);
          }

          // check file size (max 25MB)
          if (file.size > 25 * 1024 * 1024) {
            return cb(new Error('File size should not exceed 25MB'), false);
          }
          cb(null, true);
        },
      },
    ),
  )
  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: Request, @Body() updateLeadDto: UpdateLeadDto, @UploadedFiles() files: { files?: Express.Multer.File[] }) {
    try {
      // Handle file uploads and store file paths in the database
      files?.files?.forEach(async file => {
        const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
        const key = `${appConfig().storageUrl.lead}${generatedFilename}`;
        await SojebStorage.put(key, file.buffer);
        updateLeadDto.attachments?.push(generatedFilename);
      });

      updateLeadDto.updated_by = req?.user?.userId;
      updateLeadDto.updated_source = 'Admin Panel';

      const result = await this.leadService.update(id, updateLeadDto);

      result.attachments = result.attachments?.map(filename => {
        const key = `${appConfig().storageUrl.lead}${filename}`;
        return SojebStorage.url(key);
      });
      
      return {
        success: true,
        message: 'Lead updated successfully',
        data: result,
      };

    } catch (error) {
      // Clean up any uploaded files if an error occurs
      if (updateLeadDto.attachments) {
        for (const filename of updateLeadDto.attachments) {
          const key = `${appConfig().storageUrl.lead}${filename}`;
          await SojebStorage.delete(key);
        }
      }
      throw error;
    }
  }

  // Asign lead to a user and log the activity
  @HttpCode(HttpStatus.OK)
  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  @ApiOperation({ summary: 'Assign a lead to a user' })
  @ApiResponse({
    status: 200,
    description: 'Lead assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. You do not have permission to assign leads.',
  })
  @RequirePermission('lead:assign')
  @LogActivity({ action: 'assign', entity: 'lead' })
  async assignLead(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto, @Req() req: Request) {
    assignLeadDto.assigned_by_id = req?.user?.userId;
    const result = await this.leadService.assignLead(id, assignLeadDto);
    return {
      success: true,
      message: 'Lead assigned successfully',
      data: result,
    };
  }


  @HttpCode(HttpStatus.OK)
  @Patch(':id/unassign')
  @ApiOperation({ summary: 'Unassign a lead from a user' })
  @ApiResponse({
    status: 200,
    description: 'Lead unassigned successfully',
  })
  @RequirePermission('lead:unassign')
  @LogActivity({ action: 'unassign', entity: 'lead' })
  async unassignLead(@Param('id') id: string, @Req() req: Request) {
    const unassignLeadDto: UnassignLeadDto = {
      assigned_by_id: req?.user?.userId,
      assignment_source: 'Admin Panel',
    };
    const result = await this.leadService.unassignLead(id, unassignLeadDto);
    return {
      success: true,
      message: 'Lead unassigned successfully',
      data: result,
    };
  }



  @ApiOperation({ summary: 'Delete a lead by ID' })
  @LogActivity({ action: 'delete', entity: 'lead' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.leadService.remove(id);
    return {
      success: true,
      message: 'Lead removed successfully',
      data: result,
    };
  }
}
