import { SetMetadata } from '@nestjs/common';

export interface LogOptions {
  action: string;
  entity: string;
}

export const LOG_ACTIVITY_KEY = 'log_activity';
export const LogActivity = (options: LogOptions) => SetMetadata(LOG_ACTIVITY_KEY, options);