import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { GetPageSectionsQueryDto } from './dto/get-page-sections.query.dto';
import { PagesApplicationService } from './pages.application.service';

@ApiTags('Application / Pages')
@UseInterceptors(TransformResponseInterceptor)
@Controller('application/pages')
export class PagesApplicationController {
  constructor(private readonly pagesApplicationService: PagesApplicationService) {}

  @Get(':pageName')
  @ApiOperation({ summary: 'Fetch all active sections for a public page sorted by sortOrder' })
  async getPageSections(
    @Param('pageName') pageName: string,
    @Query() query: GetPageSectionsQueryDto,
  ) {
    return this.pagesApplicationService.getActivePageSections(
      pageName,
      query.keys ?? [],
    );
  }
}
