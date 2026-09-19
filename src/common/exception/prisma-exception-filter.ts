import {
    Catch,
    ExceptionFilter,
    ArgumentsHost,
    HttpException,
  } from '@nestjs/common';
  import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
  
  @Catch(PrismaClientKnownRequestError)
  export class PrismaExceptionFilter implements ExceptionFilter {
    catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
      const response = host.switchToHttp().getResponse();
      const status = this.getHttpStatus(exception.code);
  
      // Handle different Prisma error codes
      let message = 'Invalid data provided';
      let error = 'Something went wrong';
  
      if (process.env.NODE_ENV === 'development') {
        switch (exception.code) {
            case 'P2002':
                // Unique constraint violation (e.g., duplicate value for a unique field)
                message = 'Unique constraint violation';
                break;
  
            case 'P2003':
                // Foreign key constraint violation (e.g., trying to delete a record with a foreign key reference)
                message = 'Foreign key constraint violation';
                break;
  
            case 'P2025':
                // Record not found (e.g., trying to find a record that doesn't exist)
                message = 'Record not found';
                break;
  
            case 'P2001':
                // Record not found (e.g., trying to find a related record with `findUnique` or `findFirst`)
                message = 'Related record not found';
                break;
  
            case 'P2016':
                // Invalid field error (e.g., querying a non-existing field)
                message = 'Invalid field provided';
                break;
  
            case 'P2026':
                // Query validation failure (e.g., invalid query syntax)
                message = 'Query validation failed';
                break;
  
            case 'P2018':
                // Invalid argument error (e.g., passing incorrect argument to a query)
                message = 'Invalid argument';
                break;
  
            case 'P2019':
                // Transaction error (e.g., error with nested transaction)
                message = 'Transaction error';
                break;
  
            case 'P2027':
                // Unsupported database operation (e.g., trying to use an unsupported operation on the database)
                message = 'Unsupported database operation';
                break;
  
            default:
                // For any other error code
                message = `Prisma error: ${exception.message}`;
                break;
        }
        // message = exception.message;
        error = exception.message;
      }
  
      // Return the error response with a specific HTTP status code
      response.status(status).json({
        success: false,
        message: message,
        error: error,
        statusCode: status,
      });
    }
  
    private getHttpStatus(errorCode: string): number {
      switch (errorCode) {
        case 'P2002': // Unique constraint violation
          return 400; // Bad Request
        case 'P2003': // Foreign key constraint violation
          return 400; // Bad Request
        case 'P2025': // Record not found
          return 404; // Not Found
        case 'P2016': // Invalid field error
          return 400; // Bad Request
        case 'P2026': // Query validation failure
          return 400; // Bad Request
        case 'P2018': // Invalid argument error
          return 400; // Bad Request
        case 'P2019': // Transaction error
          return 500; // Internal Server Error
        case 'P2027': // Unsupported database operation
          return 500; // Internal Server Error
        default:
          return 500; // Default error code for unexpected errors
      }
    }
  }
  