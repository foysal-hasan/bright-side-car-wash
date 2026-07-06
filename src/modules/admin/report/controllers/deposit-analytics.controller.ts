import { Controller, Get, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { DepositAnalyticsService } from '../services/deposit.analytics.service';
import { DepositRevenueQueryDto } from '../dto/deposit.revenue.query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Admin Deposit Analytics')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard) 
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