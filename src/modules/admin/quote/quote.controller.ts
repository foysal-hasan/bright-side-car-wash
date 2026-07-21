import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { FindAllQuotesDto } from './dto/find-all-quotes.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';


@ApiBearerAuth()
@ApiTags('Admin / Quotes')
@Controller('admin/quotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(ActivityLogInterceptor, TransformResponseInterceptor)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all quotes with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of quotes retrieved successfully.',
  })
  @LogActivity({ action: 'read', entity: 'quote' })
  findAll(@Query() query: FindAllQuotesDto) {
    return this.quoteService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by ID' })
  @ApiParam({ name: 'id', description: 'The CUID of the quote', example: 'clx123abc456' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quote details retrieved successfully.',
  })
  @LogActivity({ action: 'read', entity: 'quote' })
  @ApiNotFoundResponse({ description: 'Quote not found.' })
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing quote' })
  @ApiParam({ name: 'id', description: 'The CUID of the quote to update', example: 'clx123abc456' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quote successfully updated.',
  })
  @LogActivity({ action: 'update', entity: 'quote' })
  @ApiNotFoundResponse({ description: 'Quote not found.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a quote' })
  @ApiParam({ name: 'id', description: 'The CUID of the quote to soft delete', example: 'clx123abc456' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quote soft-deleted successfully.',
  })
  @ApiNotFoundResponse({ description: 'Quote not found.' })
  @LogActivity({ action: 'delete', entity: 'quote' })
  remove(@Param('id') id: string) {
    return this.quoteService.remove(id);
  }
}