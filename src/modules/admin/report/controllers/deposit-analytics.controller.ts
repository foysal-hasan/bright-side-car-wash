import { Controller, Get, Query, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { DepositAnalyticsService } from '../services/deposit.analytics.service';
import { DepositRevenueQueryDto } from '../dto/deposit.revenue.query.dto';
import { ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';

@ApiTags('Admin Deposit Analytics')
@UseInterceptors(TransformResponseInterceptor)
@Controller('analytics')
export class DepositAnalyticsController {
  constructor(private readonly analyticsService: DepositAnalyticsService) {}

  @Get('deposit-revenue')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStats(@Query() query: DepositRevenueQueryDto) {
    return this.analyticsService.getDepositRevenueStats(query);
  }
}