import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";


@Injectable()
export class SquareService {
  private squareClient: SquareClient;

  constructor() {
    const accessToken = "EAAAl0BpMLTId7BDqo1iDNxEheQvZ_sCBlmNie1SC65312W7oMhzYj2Gd1n5imfk";
    const environment = SquareEnvironment.Sandbox;


    console.log('🔵 [BACKEND] Initializing Square client...');
    console.log('🔵 [BACKEND] Environment:', environment);

    this.squareClient = new SquareClient({
      token: accessToken,
      environment: environment,
    });

    console.log('🟢 [BACKEND] Square client initialized!');
  }

  async createPayment(sourceId: string, amount: number, currency: string = 'USD') {
    console.log('🔵 [BACKEND] Creating payment with:', {
      sourceId: sourceId.substring(0, 10) + '...',
      amount: amount,
      currency: currency,
      amountInCents: Math.round(amount * 100),
    });

    try {
      // Convert dollars to cents (Square requires smallest currency unit)
      const amountCents = Math.round(amount * 100);

      const result = await this.squareClient.payments.create({
        idempotencyKey: randomUUID(), // ⚠️ REQUIRED - prevents double charges!
        sourceId: sourceId,
        amountMoney: {
          currency: "USD",
          amount: BigInt(amountCents),
        },
        autocomplete: true, // Capture payment immediately
      });

      console.log('🔵 [BACKEND] Square payment response:', result);

      console.log('🟢 [BACKEND] Square payment success:', {
        paymentId: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney.amount,
        receiptUrl: result.payment.receiptUrl,
      });

      return {
        success: true,
        payment: result.payment,
      };
    } catch (error: any) {
      console.error('🔴 [BACKEND] Square payment error:', {
        message: error.message,
        statusCode: error.statusCode,
        errors: error.errors,
      });

      throw new InternalServerErrorException({
        success: false,
        error: {
          message: error.message || 'Payment processing failed',
          code: error.statusCode || 500,
        },
      });
    }
  }

  async getPayment(paymentId: string) {
    try {
      console.log('🔵 [BACKEND] Getting payment:', paymentId);

      const result = await this.squareClient.payments.get({ paymentId });

      console.log('🟢 [BACKEND] Payment retrieved:', result.payment.id);

      return result.payment;
    } catch (error: any) {
      console.error('🔴 [BACKEND] Get payment error:', error.message);
      throw new InternalServerErrorException({
        success: false,
        error: {
          message: error.message || 'Failed to fetch payment',
        },
      });
    }
  }

  // async refundPayment(paymentId: string, amount: number) {
  //   try {
  //     console.log('🔵 [BACKEND] Refunding payment:', {
  //       paymentId: paymentId,
  //       amount: amount,
  //       amountInCents: Math.round(amount * 100),
  //     });

  //     const amountCents = Math.round(amount * 100);

  //     const { result } = await this.squareClient.refundsApi.refundPayment({
  //       idempotencyKey: randomUUID(),
  //       paymentId: paymentId,
  //       amountMoney: {
  //         currency: 'USD',
  //         amount: BigInt(amountCents),
  //       },
  //     });

  //     console.log('🟢 [BACKEND] Refund successful:', result.refund.id);

  //     return {
  //       success: true,
  //       refund: result.refund,
  //     };
  //   } catch (error: any) {
  //     console.error('🔴 [BACKEND] Refund error:', error.message);
  //     throw new InternalServerErrorException({
  //       success: false,
  //       error: {
  //         message: error.message || 'Refund failed',
  //       },
  //     });
  //   }
  // }
}


@Injectable()
export class BookingService {
  constructor(private squareService: SquareService, private prisma: PrismaService) {}

  async createBooking(createBookingDto: CreateBookingDto) {
    const { bookingData, paymentData } = createBookingDto;

    try {
      // 1. Process Square payment
      const paymentResult = await this.squareService.createPayment(
        paymentData.squareToken,
        paymentData.amount
      );

      // 2. Save booking to database
      const booking = await this.prisma.lead.create({
        data: {
          name: bookingData.customerName,
          email: bookingData.email,
          phone: bookingData.phone,
          serviceType: bookingData.serviceType,
          preferredDate: new Date(bookingData.preferredDate),
          preferredTime: bookingData.preferredTime,
          vehicleType: bookingData.vehicleType,
          notes: bookingData.notes,
          depositStatus: 'paid',
          squarePaymentId: paymentResult.payment.id,
          depositAmount: paymentData.amount,
          leadStatus: 'new',
        },
      });


      // 4. Return success response
      return {
        success: true,
        data: {
          bookingId: booking.id,
          paymentStatus: 'paid',
          payment: {
            id: paymentResult.payment.id,
            status: paymentResult.payment.status,
            amount: paymentData.amount,
            currency: paymentData.currency || 'USD',
            receiptUrl: paymentResult.payment.receiptUrl,
          },
          customer: {
            name: booking.name,
            email: booking.email,
            phone: booking.phone,
          },
          // bookingDetails: {
          //   serviceType: booking.serviceType,
          //   preferredDate: booking.preferredDate,
          //   preferredTime: booking.preferredTime,
          //   vehicleType: booking.vehicleType,
          // },
        },
      };

    } catch (error) {
      // Return error response
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
        },
      };
    }
  }
}


// backend/src/square/square.service.ts
import { InternalServerErrorException } from '@nestjs/common';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';


