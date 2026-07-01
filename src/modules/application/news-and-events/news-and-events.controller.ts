import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NewsAndEventsService } from './news-and-events.service';
import { QueryNewsAndEventDto } from './dto/query-news-and-event.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';


@ApiTags('Application / Public News and Events')
@Controller('news-and-events')  
@UseInterceptors(TransformResponseInterceptor)
export class NewsAndEventsController {
  constructor(private readonly service: NewsAndEventsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get active category listings' })
  get_categories() {
    return this.service.get_categories();
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all public filtered articles with offset pagination' })
  async find_all(@Query() query: QueryNewsAndEventDto) {
    const result = await this.service.find_all_published(query);
    result.items.forEach(item => {
      if (item.image_url) {
        const key = `${appConfig().storageUrl.newsAndEvents}${item.image_url}`;
        item.image_url = SojebStorage.url(key);
      }
    });
    return result;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Fetch item data content body structure matching specified unique slug identity text' })
  async find_one(@Param('slug') slug: string) {
    const result = await this.service.find_by_slug(slug);
    if (result.image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.image_url}`;
      result.image_url = SojebStorage.url(key);
    }
    return result;
  }
}