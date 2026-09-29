import {
    BadRequestException,
    Injectable,
    PipeTransform,
  } from '@nestjs/common';
  
  @Injectable()
  export class ParseCuidPipe implements PipeTransform<string, string> {
    private readonly cuidV1Regex = /^c[a-z0-9]{24,}$/;
    private readonly cuidV2Regex = /^[a-z][a-z0-9]{7,}$/;
  
    transform(value: string): string {
      if (!value || typeof value !== 'string') {
        throw new BadRequestException('Invalid ID format');
      }
  
      const isCuidV1 = this.cuidV1Regex.test(value);
      const isCuidV2 = this.cuidV2Regex.test(value);
  
      if (!isCuidV1 && !isCuidV2) {
        throw new BadRequestException(
          'ID must be a valid CUID or CUID2',
        );
      }
  
      return value;
    }
  }
  