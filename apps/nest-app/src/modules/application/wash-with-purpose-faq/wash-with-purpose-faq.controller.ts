import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { WashWithPurposeFaqService } from './wash-with-purpose-faq.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';

@ApiTags('Application / FAQ Management Wash with purpose page')
@UseInterceptors(TransformResponseInterceptor)
@Controller('wash-with-purpose-faq')
export class WashWithPurposeFaqController {
  constructor(private readonly washWithPurposeFaqService: WashWithPurposeFaqService) { }

  @Get()
  @ApiOperation({ summary: 'Get all published FAQs (Public User)' })
  @ApiResponse({ status: 200, description: 'Return all published FAQs.' })
  findAllUser() {
    return this.washWithPurposeFaqService.findAllUser();
  }
}
