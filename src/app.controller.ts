import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { Readable } from 'stream';
import appConfig from './config/app.config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('/')
  @Header('Content-Type', 'text/html')
  getHello(): string {
    return this.appService.getHello();
  }


  @Get('/health')
  @HttpCode(200)
  health() {
    return { status: 'healthy' };
  }

  @ApiExcludeEndpoint()
  @Get('test-chunk-stream')
  async chunkStream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders(); // make sure headers are sent immediately

    const stream = new Readable({
      read() { },
    });

    // Pipe the stream to the response
    stream.pipe(res);

    let counter = 0;
    const interval = setInterval(() => {
      if (counter >= 10) {
        stream.push('Stream complete.\n');
        stream.push(null); // ends the stream
        clearInterval(interval);
      } else {
        stream.push(`Chunk ${counter + 1} at ${new Date().toISOString()}\n`);
        counter++;
      }
    }, 500);
  }

  @ApiExcludeEndpoint()
  @Get('test-file-stream')
  testFileStream(@Res({ passthrough: true }) res: Response) {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="package.json"',
    });
  }

  @ApiExcludeEndpoint()
  @Post('test-file-upload')
  @UseInterceptors(
    FileInterceptor('image', { storage: multer.memoryStorage() as any }),
  )
  @ApiExcludeEndpoint()
  async test(@UploadedFile() image?: Express.Multer.File) {
    const result = await this.appService.test(image);
    return result;
  }


  @ApiExcludeEndpoint()
  @Get('/stripe/onboarding/refresh')
  stripeOnboardingRefresh() {
    return this.appService.stripeOnboardingRefresh();
  }

  @ApiExcludeEndpoint()
  @Get('/stripe/onboarding/return')
  stripeOnboardingReturn() {
    return this.appService.stripeOnboardingReturn();
  }
}
