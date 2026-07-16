import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IEmailProvider } from './interfaces/email-provider.interface';
import { ComposeEmailDto } from './dto/compose-email.dto';
import { EmailLogQueryDto } from './dto/email-log-query.dto';
import { EMAIL_PROVIDER_TOKEN } from './constants';
import { EmailStatus } from 'src/generated/prisma/browser';
import appConfig from 'src/config/app.config';

@Injectable()
export class EmailManagementService {
  private logger = new Logger(EmailManagementService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: IEmailProvider // Injected via decoupled token
  ) {}

  async sendEmail(dto: ComposeEmailDto, currentUserId: string, fileUrls: string[]) {
    const existingLead = await this.prisma.lead.findFirst({
        where: { email: { equals: dto.to, mode: 'insensitive' }, deleted_at: null },
        select: { id: true }
      });

      const mailSenderName = appConfig().mail.sender_email.trim();
      const mailSenderEmail = appConfig().mail.sender_email.trim().toLowerCase();

    try {
      // 1. Call your modular, pluggable email provider strategy instance
      const messageId = await this.emailProvider.send({
        from: { email: mailSenderEmail, name: mailSenderName },
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        html: dto.body,
        attachments: fileUrls
      });

      // 2. Persist comprehensive database history tracking audit logs
      return await this.prisma.emailLog.create({
        data: {
          sender_name: mailSenderName,
          sender_mail: mailSenderEmail,
          to: dto.to,
          cc: dto.cc || [],
          bcc: dto.bcc || [],
          subject: dto.subject,
          body: dto.body,
          files: dto.attachments || [],
          leadId: existingLead?.id || null,
          created_by_id: currentUserId,
          status: EmailStatus.DELIVERED, // Assuming the email was sent successfully
          provider_email_id: messageId.toString() // Store the provider's message ID for tracking
        }
      });
    } catch (error) {
      await this.prisma.emailLog.create({
        data: {
          sender_name: mailSenderName,
          sender_mail: mailSenderEmail,
          to: dto.to,
          cc: dto.cc || [],
          bcc: dto.bcc || [],
          subject: dto.subject,
          body: dto.body,
          files: dto.attachments || [],
          leadId: existingLead?.id || null,
          created_by_id: currentUserId,
          status: EmailStatus.FAILED // Assuming the email failed to send
        }
      });
      this.logger.error('Error sending email:', error);
      throw new BadRequestException('Failed to process system email execution.');
    }
  }

  async getPaginatedLogs(query: EmailLogQueryDto) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = search ? {
      OR: [
        { to: { contains: search, mode: 'insensitive' } },
        { sender_name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    const [totalItems, logs] = await Promise.all([
      this.prisma.emailLog.count({ where: whereCondition }),
      this.prisma.emailLog.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { first_name: true, last_name: true, email: true } },
          lead: { select: { name: true } }
        }
      })
    ]);

    return {
      data: logs,
      meta: {
        totalItems,
        itemCount: logs.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      }
    };
  }

  async getLogById(id: string) {
    return this.prisma.emailLog.findUnique({
      where: { id },
      include: {
        creator: { select: { first_name: true, last_name: true, email: true } },
        lead: { select: { name: true } }
      }
    });
  }

  // Delete a specific email log by ID
  async deleteLogById(id: string) {
    const log = await this.prisma.emailLog.delete({ where: { id } });
    return log;
  }
}