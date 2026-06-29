import { Injectable } from '@nestjs/common';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentStatus } from 'src/generated/prisma/enums';
import { GetPaymentsTransactionQueryDto } from './dto/get-payments-transaction-query.dto';
import { Prisma } from 'src/generated/prisma/client';
import * as XLSX from 'xlsx';
import { ExportPaymentsTransactionQueryDto } from './dto/export-payments-transaction-query.dto';

@Injectable()
export class PaymentTransactionService {
  constructor(private readonly prisma: PrismaService) { }

  async getTransactionStats() {
    const now = new Date();

    // 1. Define date bounds for Current Month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Define date bounds for Last Month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 3. Execute all target metric counts & sums concurrently via Prisma Transaction
    const [
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthPaid,
      lastMonthPaid,
      thisMonthPending,
      lastMonthPending,
      thisMonthFailed,
      lastMonthFailed,
    ] = await this.prisma.$transaction([
      // --- Total Revenue Sums (Aggregating the actual amount column) ---
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { created_at: { gte: startOfThisMonth, lte: endOfThisMonth } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // --- Paid Deposits Counts ---
      this.prisma.payment.count({
        where: { status: PaymentStatus.PAID, created_at: { gte: startOfThisMonth, lte: endOfThisMonth } },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PAID, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // --- Pending Counts ---
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING, created_at: { gte: startOfThisMonth, lte: endOfThisMonth } },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // --- Failed Counts (Replacing Refunded) ---
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED, created_at: { gte: startOfThisMonth, lte: endOfThisMonth } },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
    ]);

    // Extract values safely (fall back to 0 if no entries exist)
    const currentRevValue = Number(thisMonthRevenue._sum.amount || 0);
    const lastRevValue = Number(lastMonthRevenue._sum.amount || 0);

    // Helper to dynamically calculate string percentages (+12%, -2.1%, etc.)
    const calculatePercentageDiff = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const diff = ((current - previous) / previous) * 100;
      const prefix = diff >= 0 ? '+' : '';
      return `${prefix}${diff.toFixed(1)}%`;
    };

    return {
      totalRevenue: {
        value: currentRevValue,
        percentage: calculatePercentageDiff(currentRevValue, lastRevValue),
        status: currentRevValue >= lastRevValue ? 'up' : 'down',
      },
      paidDeposits: {
        value: thisMonthPaid,
        percentage: calculatePercentageDiff(thisMonthPaid, lastMonthPaid),
        status: thisMonthPaid >= lastMonthPaid ? 'up' : 'down',
      },
      pending: {
        value: thisMonthPending,
        percentage: calculatePercentageDiff(thisMonthPending, lastMonthPending),
        status: thisMonthPending >= lastMonthPending ? 'up' : 'down',
      },
      failed: {
        value: thisMonthFailed,
        percentage: calculatePercentageDiff(thisMonthFailed, lastMonthFailed),
        status: thisMonthFailed >= lastMonthFailed ? 'up' : 'down',
      },
    };
  }

  async findAll(query: GetPaymentsTransactionQueryDto) {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    // Formulate modular where conditions based on search metrics
    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } },
        { transaction_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      transactions: data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }


  private async getExportData(query: ExportPaymentsTransactionQueryDto) {
    const { search, status } = query;
    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } },
        { transaction_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Map your database records to a human-readable layout matching your grid headers
    return payments.map((p) => ({
      'Customer Name': p.customer_name || 'N/A',
      'Service': p.service || 'N/A',
      'Transaction Id': p.transaction_id,
      'Amount': `${p.currency} ${Number(p.amount).toFixed(2)}`,
      'Status': p.status,
      'Date': p.created_at.toISOString().split('T')[0], // YYYY-MM-DD format
    }));
  }


  async exportToExcel(query: ExportPaymentsTransactionQueryDto): Promise<Buffer> {
    const data = await this.getExportData(query);

    // Create a new sheet worksheet from the structural rows array
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

    // Generate sheet buffer stream
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    return excelBuffer;
  }


  async exportToCsv(query: ExportPaymentsTransactionQueryDto): Promise<Buffer> {
    const data = await this.getExportData(query);

    const worksheet = XLSX.utils.json_to_sheet(data);
    // Convert worksheet layout directly into Comma-Separated Values text block
    const csvString = XLSX.utils.sheet_to_csv(worksheet);

    return Buffer.from(csvString, 'utf-8');
  }

}
