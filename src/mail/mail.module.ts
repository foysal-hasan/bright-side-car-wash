import { MailerModule } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { BullModule } from '@nestjs/bullmq';
import { MailProcessor } from './processors/mail.processor';

@Global()
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('mail.host');
        const port = Number(configService.get<number>('mail.port'));
        const user = configService.get<string>('mail.user');
        const password = configService.get<string>('mail.password');
        const from = configService.get<string>('mail.from');

        // console.log('Mail config:', {
        //   host,
        //   port,
        //   user,
        //   password: password ? '******' : undefined,
        //   secure: port === 465,
        // });

        return {
          transport: {
            host,
            port,
            secure: port === 465,
            auth: {
              user,
              pass: password,
            },
          },
          defaults: {
            from,
          },
          template: {
            dir: process.cwd() + '/dist/mail/templates/',
            adapter: new EjsAdapter(),
            options: {},
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'mail-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true, // ✅ immediately delete
        removeOnFail: {
          age: 60 * 60 * 24, // optional: keep failed jobs 24h
        },
      },
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
