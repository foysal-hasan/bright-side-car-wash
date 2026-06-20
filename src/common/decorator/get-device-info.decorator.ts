// src/common/decorators/get-device-info.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as requestIp from 'request-ip';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  ip: string;
  deviceName: string;
}

export const GetDeviceInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DeviceInfo => {
    const request = ctx.switchToHttp().getRequest();
    
    // Get IP (handles proxies if trust proxy is enabled in main.ts)
    const ip = requestIp.getClientIp(request) || request.ip;
    
    // Parse User Agent
    const uaHeader = request.headers['user-agent'];
    const parser = new UAParser(uaHeader);
    const uaResult = parser.getResult();
    
    const deviceName = uaResult.browser.name 
      ? `${uaResult.browser.name} on ${uaResult.os.name} (${uaResult.device.type || 'Desktop'})`
      : 'Unknown Device';

    return { ip, deviceName };
  },
);