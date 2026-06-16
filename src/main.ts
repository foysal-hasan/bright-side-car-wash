// external imports
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as path from 'path';
import express from 'express';
// internal imports
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { SojebStorage } from './common/lib/Disk/SojebStorage';
import { PrismaExceptionFilter } from './common/exception/prisma-exception-filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for Stripe webhooks (must be before any JSON body parsing)
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));
  // app.use('/api/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/stripe/onboarding/refresh', '/stripe/onboarding/return'],
  });
  app.enableCors();
  app.use(helmet());
  // Enable it, if special charactrers not encoding perfectly
  // app.use((req, res, next) => {
  //   // Only force content-type for specific API routes, not Swagger or assets
  //   if (req.path.startsWith('/api') && !req.path.startsWith('/api/docs')) {
  //     res.setHeader('Content-Type', 'application/json; charset=utf-8');
  //   }
  //   next();
  // });


  // static assets
  app.useStaticAssets(path.join(process.cwd(), 'public'), {
    index: false,
    prefix: '/public',
  });

  app.useStaticAssets(path.join(process.cwd(), 'public/storage'), {
    index: false,
    prefix: '/storage',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.useGlobalFilters(new CustomExceptionFilter(), new PrismaExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // aws s3
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
      // google cloud storage
      gcpProjectId: appConfig().fileSystems.gcs.projectId,
      gcpKeyFile: appConfig().fileSystems.gcs.keyFile,
      gcpApiEndpoint: appConfig().fileSystems.gcs.apiEndpoint,
      gcpBucket: appConfig().fileSystems.gcs.bucket,
    },
  });

  // swagger
  const options = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} api`)
    .setDescription(`${process.env.APP_NAME} api docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, options, {
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup('api/docs', app, document);
  // end swagger

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
