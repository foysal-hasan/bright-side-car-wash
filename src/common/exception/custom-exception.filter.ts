import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { pinoLogger } from '../../logger.config';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const method = request.method;
    const url = request.url;
    const userAgent = request.headers?.['user-agent'];
    const ip = request.ip || request.connection?.remoteAddress;

    const is5xx = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    const is4xx = status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR;

    if (is5xx) {
      pinoLogger.error(
        {
          err: exception,
          stack: exception.stack,
          statusCode: status,
          method,
          url,
          ip,
          userAgent,
          exceptionResponse,
        },
        `[HTTP ${status}] ${exception.message} at ${method} ${url}`,
      );
    } else if (is4xx) {
      pinoLogger.warn(
        {
          statusCode: status,
          method,
          url,
          ip,
          userAgent,
          message: exception.message,
          exceptionResponse,
        },
        `[HTTP ${status}] Client error at ${method} ${url}`,
      );
    } else {
      pinoLogger.info(
        {
          statusCode: status,
          method,
          url,
          message: exception.message,
        },
        `[HTTP ${status}] ${method} ${url}`,
      );
    }

    if (exception instanceof MulterError) {
      return response.status(400).json({
        success: false,
        message:
          exception.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum allowed size is 5MB'
            : `File upload error: ${exception.message}`,
      });
    }

    let message: string | string[] = 'Internal Server Error';
    let error = exception.name;
    let statusCode = status;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    if (typeof exceptionResponse === 'object') {
      message =
        Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : exceptionResponse.message || exception.message;

      error = exceptionResponse.error || error;
      statusCode = exceptionResponse.statusCode || statusCode;
    }

    return response.status(statusCode).json({
      success: false,
      message,
      error,
      statusCode,
    });
  }
}
