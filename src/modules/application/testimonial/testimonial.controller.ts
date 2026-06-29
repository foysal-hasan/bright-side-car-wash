import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TestimonialService } from './testimonial.service';
import { GetTestimonialsQueryDto } from './dto/get-testimonials-query.dto';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';

@ApiTags('Application / Testimonials')
@UseInterceptors(TransformResponseInterceptor)
@Controller('application/testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) { }

  @Get()
  @ApiOperation({ summary: 'Fetch client-facing testimonials optimized for display' })
  async getPublicTestimonials(@Query() query: GetTestimonialsQueryDto) {
    const result = await this.testimonialService.findAll(query);
    result.testimonials.forEach(testimonial => {
      if (testimonial.avatar) {
        const key = `${appConfig().storageUrl.testimonialAvatars}${testimonial.avatar}`;
        testimonial.avatar = SojebStorage.url(key);
      }
    });
    return result;
  }
}