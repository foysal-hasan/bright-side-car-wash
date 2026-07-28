import {
    Catch,
    ExceptionFilter,
    ArgumentsHost,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
  import { pinoLogger } from '../../logger.config';
  
  @Catch(PrismaClientKnownRequestError)
  export class PrismaExceptionFilter implements ExceptionFilter {
    catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest();
      const response = ctx.getResponse();
      const status = this.getHttpStatus(exception.code);
  
      const method = request.method;
      const url = request.url;
      const userAgent = request.headers?.['user-agent'];
      const ip = request.ip || request.connection?.remoteAddress;
  
      pinoLogger.error(
        {
          err: exception,
          stack: exception.stack,
          prismaCode: exception.code,
          prismaClientVersion: exception.clientVersion,
          prismaMeta: exception.meta,
          statusCode: status,
          method,
          url,
          ip,
          userAgent,
        },
        `[PRISMA ${exception.code}] ${exception.message} at ${method} ${url}`,
      );
  
      let message = 'Invalid data provided';
      let error = 'Something went wrong';
  
      if (process.env.NODE_ENV === 'development') {
        switch (exception.code) {
            case 'P2002':
                message = 'Unique constraint violation';
                break;
  
            case 'P2003':
                message = 'Foreign key constraint violation';
                break;
  
            case 'P2025':
                message = 'Record not found';
                break;
  
            case 'P2001':
                message = 'Related record not found';
                break;
  
            case 'P2016':
                message = 'Invalid field provided';
                break;
  
            case 'P2026':
                message = 'Query validation failed';
                break;
  
            case 'P2018':
                message = 'Invalid argument';
                break;
  
            case 'P2019':
                message = 'Transaction error';
                break;
  
            case 'P2027':
                message = 'Unsupported database operation';
                break;
  
            default:
                message = `Prisma error: ${exception.message}`;
                break;
        }
        error = exception.message;
      }
  
      response.status(status).json({
        success: false,
        message: message,
        error: error,
        statusCode: status,
      });
    }
  
    private getHttpStatus(errorCode: string): number {
      switch (errorCode) {
        case 'P2002':
          return 400;
        case 'P2003':
          return 400;
        case 'P2025':
          return 404;
        case 'P2016':
          return 400;
        case 'P2026':
          return 400;
        case 'P2018':
          return 400;
        case 'P2019':
          return 500;
        case 'P2027':
          return 500;
        default:
          return 500;
      }
    }
  }
  