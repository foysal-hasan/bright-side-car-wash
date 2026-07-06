import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from './quote.service';

@ApiTags('Application Quote')
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a quote request and create lead if not already present' })
  @ApiBody({ type: CreateQuoteDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lead created or existing lead returned without update' })
  async requestQuote(@Body() createQuoteDto: CreateQuoteDto) {
    await this.quoteService.createQuote(createQuoteDto);

    return {
      success: true,
      message: 'Quote request submitted successfully',
    };
  }
}
