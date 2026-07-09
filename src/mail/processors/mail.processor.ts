import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MAIL_PROVIDER_TOKEN } from '../constants';
import { IMailProvider } from '../interfaces/mail-provider.interface';
import { TemplateRendererService } from '../template-renderer.service';

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly mailJobs = new Set([
    'sendMemberInvitation',
    'sendInviteEmail',
    'sendOtpCodeToEmail',
    'sendVerificationLink',
    'sendBookingConfirmationEmail',
  ]);

  constructor(
    @Inject(MAIL_PROVIDER_TOKEN)
    private readonly mailProvider: IMailProvider,
    private readonly templateRenderer: TemplateRendererService,
  ) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} with name ${job.name} completed`);
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} with name ${job.name}`);

    try {
      if (this.mailJobs.has(job.name)) {
        const html = await this.templateRenderer.render(
          job.data.template,
          job.data.context ?? {},
        );

        const from = this.parseFrom(job.data.from);
        const messageId = await this.mailProvider.send({
          to: job.data.to,
          from,
          cc: job.data.cc,
          bcc: job.data.bcc,
          subject: job.data.subject,
          html,
          attachments: job.data.attachments,
        });

        return { messageId };
      }

      if (job.name === 'sendSmsOtpCode') {
        this.logger.log('Sending SMS OTP code');
        return;
      }

      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} with name ${job.name}`,
        error,
      );
      throw error;
    }
  }

  private parseFrom(from?: string | { email: string; name?: string }) {
    if (!from) return undefined;

    if (typeof from !== 'string') {
      return from;
    }

    const matched = from.match(/^(.*)<(.+)>$/);
    if (!matched) {
      return { email: from.trim() };
    }

    return {
      name: matched[1].trim().replace(/^"|"$/g, ''),
      email: matched[2].trim(),
    };
  }
}
