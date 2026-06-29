import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, Res, UseGuards } from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetPaymentsTransactionQueryDto } from './dto/get-payments-transaction-query.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { Response } from 'express';
import { ExportPaymentsTransactionQueryDto } from './dto/export-payments-transaction-query.dto';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';

@ApiTags('Admin Payment Transaction Management')
@ApiBearerAuth()
@Controller('payment-transaction')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(ActivityLogInterceptor, TransformResponseInterceptor)
@RequirePermission('payment-transaction')
export class PaymentTransactionController {
  constructor(private readonly paymentTransactionService: PaymentTransactionService) { }

  @Get('stats')
  @ApiOperation({ summary: 'Get overview analytics cards data' })
  @ApiResponse({ status: 200, description: 'Returns counter stats vs last month indicators' })
  @LogActivity({ action: 'get', entity: 'payment-transaction-stats' })
  getTransactionStats() {
    return this.paymentTransactionService.getTransactionStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of all payment transactions' })
  @ApiResponse({ status: 200, description: 'Returns a list of payments matching filters' })
  @LogActivity({ action: 'get', entity: 'payment-transaction-list' })
  findAll(@Query() query: GetPaymentsTransactionQueryDto) {
    return this.paymentTransactionService.findAll(query);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export matching payments as Excel (.xlsx)' })
  @LogActivity({ action: 'export', entity: 'payment-transaction-excel' })
  @RequirePermission('payment-transaction:export')
  async exportExcel(@Query() query: ExportPaymentsTransactionQueryDto, @Res() res: Response) {
    const buffer = await this.paymentTransactionService.exportToExcel(query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payments-export-${Date.now()}.xlsx`,
    );

    return res.end(buffer);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export matching payments as CSV (.csv)' })
  @LogActivity({ action: 'export', entity: 'payment-transaction-csv' })
  @RequirePermission('payment-transaction:export')
  async exportCsv(@Query() query: ExportPaymentsTransactionQueryDto, @Res() res: Response) {
    const buffer = await this.paymentTransactionService.exportToCsv(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payments-export-${Date.now()}.csv`,
    );

    return res.end(buffer);
  }

}
