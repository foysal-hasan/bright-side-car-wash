import { Controller, Post, Get, Query, Body, UseInterceptors, UploadedFiles, HttpCode, HttpStatus, UseGuards, Req, Param, Delete } from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmailManagementService } from './email-management.service';
import { EmailLogQueryDto } from './dto/email-log-query.dto';
import { ComposeEmailDto } from './dto/compose-email.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { extname } from 'path';


@ApiTags('Admin Email Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/mail-management')
export class EmailManagementController {
  constructor(private readonly emailManagementService: EmailManagementService) { }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('mail-management:send_email')
  @LogActivity({ action: 'send', entity: 'email' })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Compose and dispatch an email with file uploads' })
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
  async handleSend(
    @Body() body: ComposeEmailDto,
    @Req() req: Request,
    @UploadedFiles() files: { files?: Express.Multer.File[] }
  ) {
    try {
      const fileUrls: string[] = [];
      // Handle file uploads and store file paths in the database
      files.files?.forEach(async file => {
        const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
        const key = `${appConfig().storageUrl.emailAttachments}${generatedFilename}`;
        await SojebStorage.put(key, file.buffer);
        body.attachments.push(generatedFilename);
        fileUrls.push(SojebStorage.url(key));
      });
      const currentUserId = req.user?.userId;

      return await this.emailManagementService.sendEmail(body, currentUserId, fileUrls);
    } catch (error) {
      // Clean up any uploaded files if an error occurs
      if (body.attachments) {
        for (const filename of body.attachments) {
          const key = `${appConfig().storageUrl.lead}${filename}`;
          await SojebStorage.delete(key);
        }
      }
      throw error;
    }
  }


  @Get('logs')
  @RequirePermission('mail-management:view_logs')
  @LogActivity({ action: 'view', entity: 'email_logs' })
  @ApiOperation({ summary: 'Retrieve searchable paginated history timeline audit logs list' })
  async getLogs(@Query() query: EmailLogQueryDto) {
    const result = await this.emailManagementService.getPaginatedLogs(query);

    result.data = result.data.map(log => ({
      ...log,
      files: log.files.map(filename => SojebStorage.url(`${appConfig().storageUrl.emailAttachments}${filename}`))
    }));


    return {
      success: true,
      message: 'Email logs retrieved successfully',
      data: result,
    }
  }

  @Get('logs/:id')
  @LogActivity({ action: 'view', entity: 'email_log' })
  @ApiOperation({ summary: 'Retrieve a specific email log by ID' })
  async getLogById(@Param('id') id: string) {
    const log = await this.emailManagementService.getLogById(id);

    log.files = log.files.map(filename => SojebStorage.url(`${appConfig().storageUrl.emailAttachments}${filename}`));

    return log;
  }

  @Delete('logs/:id')
  @LogActivity({ action: 'delete', entity: 'email_log' })
  @ApiOperation({ summary: 'Delete a specific email log by ID' })
  async deleteLogById(@Param('id') id: string) {
    const log = await this.emailManagementService.deleteLogById(id);
    log.files.forEach(async filename => {
      const key = `${appConfig().storageUrl.emailAttachments}${filename}`;
      await SojebStorage.delete(key);
    });
    return null;
  }

}
