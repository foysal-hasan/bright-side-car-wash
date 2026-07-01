import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Application / Public FAQ')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) { }

  @Get()
  @ApiOperation({ summary: 'Get all sanitized public FAQs structured by default display ranking order' })
  @ApiResponse({ status: 200, description: 'Array of filtered public FAQs.' })
  async findAll() {
    const faqs = await this.faqService.findAll();
    return {
      success: true,
      message: 'FAQs retrieved successfully',
      data: faqs,
    };
  }

}
