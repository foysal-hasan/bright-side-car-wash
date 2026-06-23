import { SetMetadata } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

export const OnlyApiTags = (...tags: string[]) => SetMetadata(DECORATORS.API_TAGS, tags);