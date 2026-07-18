import { Controller, Get, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { DepositAnalyticsService } from '../services/deposit.analytics.service';
import { DepositRevenueQueryDto } from '../dto/deposit.revenue.query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';

@ApiTags('Admin Deposit Analytics')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, PermissionGuard) 
@UseInterceptors(TransformResponseInterceptor)
@Controller('analytics')
export class DepositAnalyticsController {
  constructor(private readonly analyticsService: DepositAnalyticsService) {}

  @Get('deposit-revenue')
  @UsePipes(new ValidationPipe({ transform: true }))
  @RequirePermission('report:deposit_revenue')
  async getStats(@Query() query: DepositRevenueQueryDto) {
    return this.analyticsService.getDepositRevenueStats(query);
  }
}