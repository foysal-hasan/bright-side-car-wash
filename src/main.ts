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
import { DiskType } from './common/lib/Disk/Option';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: appConfig().app.environment === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
    bufferLogs: true
  });

  // Raw body size limit to 5MB to support Stripe webhook payloads
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));


  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Handle raw body for Stripe webhooks (must be before any JSON body parsing)
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));
  // app.use('/api/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/stripe/onboarding/refresh', '/stripe/onboarding/return'],
  });

  // Get origins from config service
  const corsOrigins = appConfig().app.cross_origins?.split(',') || [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      console.log(`Incoming request from origin: ${origin}`);

      // Allow if origin is in the allowed list
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        console.warn(`Allowed origins: ${corsOrigins.join(', ')}`);
        callback(new Error(`CORS policy: ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.use(helmet({
    // CORP is kept at its secure default ('same-origin') for API endpoints.
    // We selectively override it to 'cross-origin' only for static asset routes below.
  }));

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
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  app.useStaticAssets(path.join(process.cwd(), 'public/storage'), {
    index: false,
    prefix: '/storage',
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.useGlobalFilters(new CustomExceptionFilter(), new PrismaExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: appConfig().app.file_storage as DiskType,
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

  // swagger — controlled by ENABLE_SWAGGER env variable (set in appConfig)
  if (appConfig().app.enable_swagger) {
    // Protect Swagger UI with HTTP Basic Auth
    const swaggerUser = appConfig().swagger.user;
    const swaggerPassword = appConfig().swagger.password;

    app.use(['/api/docs', '/api/docs-json'], (req, res, next) => {
      const authHeader = req.headers['authorization'];

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
        return res.status(401).send('Authentication required');
      }

      const base64 = authHeader.slice('Basic '.length);
      const [user, ...rest] = Buffer.from(base64, 'base64').toString('utf-8').split(':');
      const password = rest.join(':'); // handle passwords that contain ':'

      if (user === swaggerUser && password === swaggerPassword) {
        return next();
      }

      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
      return res.status(401).send('Invalid credentials');
    });

    const options = new DocumentBuilder()
      .setTitle(`${appConfig().app.name} API`)
      .setDescription(`${appConfig().app.name} api docs`)
      .setVersion('1.0')
      .addTag(`${appConfig().app.name}`)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, options, {
      ignoreGlobalPrefix: false,
    });
    SwaggerModule.setup('api/docs', app, document);
  }
  // end swagger


  await app.listen(appConfig().app.port, '0.0.0.0');
}
bootstrap();
