import { Module } from '@nestjs/common';
import { EmailManagementService } from './email-management.service';
import { EmailManagementController } from './email-management.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { BrevoProvider } from './providers/brevo.provider';
import { EMAIL_PROVIDER_TOKEN } from './constants';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [
    EmailManagementController
  ],
  providers: [
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useClass: BrevoProvider,
    },
    EmailManagementService
  ],
})
export class EmailManagementModule { }
