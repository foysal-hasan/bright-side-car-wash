import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SquareClient, SquareEnvironment, SquareError } from 'square';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Injectable()
export class SquareUpBookingService {
  private squareClient: SquareClient;
  private readonly lockTtlMs = 10 * 60 * 1000;
  private readonly logger = new Logger(SquareUpBookingService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {
    this.squareClient = new SquareClient({
      token: appConfig().square.accessToken,
      environment:
        appConfig().square.environment === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });
  }


  /**
   * Creates an online bookable service with a fixed price active across ALL business locations.
   * @param name Name of the service (e.g., "Full Sedan Interior Detail")
   * @param priceCents Price of the service in cents (e.g., 16000 for $160.00)
   * @param durationMinutes Duration of the appointment slot in minutes (e.g., 180)
   * @param description A brief overview of what the service covers
   */
  async createBookableService(
    name: string,
    priceCents: number,
    durationMinutes: number,
    description: string,
  ) {
    try {

      // Convert minutes to milliseconds for Square's serviceDuration parameter
      const durationMilliseconds = durationMinutes * 60 * 1000;


      const response = await this.squareClient.catalog.object.upsert({
        idempotencyKey: randomUUID(),
        object: {
          type: 'ITEM',
          id: '#new-service-item', // Ephemeral ID for upsert creation rules
          itemData: {
            name: name,
            description: description,
            productType: 'APPOINTMENTS_SERVICE', // Required to expose this as a bookable appointment slot

            variations: [
              {
                type: 'ITEM_VARIATION',
                id: '#new-service-variation',
                itemVariationData: {
                  name: 'Regular Session',
                  pricingType: 'FIXED_PRICING',
                  priceMoney: {
                    amount: BigInt(priceCents),
                    currency: 'USD',
                  },
                  serviceDuration: BigInt(durationMilliseconds),
                  availableForBooking: true, // Make this variation bookable online
                  teamMemberIds: ["TMJ05qjLA76pqIAf"], // specify team members if needed
                },
              },
            ],
          },
        },
      });

      const rootItem = response.catalogObject;
      const variationItem = rootItem?.itemData?.variations?.[0];

      return {
        message: 'Bookable service item generated successfully for all locations.',
        catalogItemId: rootItem?.id,
        serviceVariationId: variationItem?.id,
        version: variationItem?.version?.toString(), // Version number required by Bookings API
      };
    } catch (error) {
      // Square SDK errors expose raw responses inside an array structure
      throw new BadRequestException(error.errors || error.message);
    }
  }

  async getLocations() {
    try {
      const response = await this.squareClient.locations.list();
      return (response.locations ?? [])
        .filter((location) => location.status === 'ACTIVE')
        .map((location) => ({
          id: location.id,
          name: location.name,
          timezone: location.timezone,
          phoneNumber: location.phoneNumber,
          address: location.address,
          businessHours: location.businessHours,
        }));
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  async getBookingBasicInfo() {
    try {
      const [businessProfileResponse, websiteInfo, locationsResponse] = await Promise.all([
        this.squareClient.bookings.getBusinessProfile(),
        this.prisma.websiteInfo.findFirst({ orderBy: { created_at: 'desc' } }),
        this.squareClient.locations.list(),
      ]);

      const profile = businessProfileResponse.businessBookingProfile;
      const appointmentSettings = profile?.businessAppointmentSettings;

      return this.toJsonSafe({
        bookingEnabled: profile?.bookingEnabled ?? false,
        allowUserCancel: profile?.allowUserCancel ?? false,
        bookingPolicy: profile?.bookingPolicy,
        supportSellerLevelWrites: profile?.supportSellerLevelWrites,
        appointmentSettings: {
          minBookingLeadTimeSeconds: appointmentSettings?.minBookingLeadTimeSeconds,
          maxBookingLeadTimeSeconds: appointmentSettings?.maxBookingLeadTimeSeconds,
          cancellationWindowSeconds: appointmentSettings?.cancellationWindowSeconds,
          cancellationFeeMoney: appointmentSettings?.cancellationFeeMoney,
          cancellationPolicy: appointmentSettings?.cancellationPolicy,
          cancellationPolicyText: appointmentSettings?.cancellationPolicyText,
          multipleServiceBookingEnabled: appointmentSettings?.multipleServiceBookingEnabled,
        },
        websiteInfo: {
          name: websiteInfo?.name,
          phoneNumber: websiteInfo?.phone_number,
          email: websiteInfo?.email,
          address: websiteInfo?.address,
          cancellationPolicy: websiteInfo?.cancellation_policy,
        },
        workingHours: (locationsResponse.locations ?? [])
          .filter((location) => location.status === 'ACTIVE')
          .map((location) => ({
            locationId: location.id,
            locationName: location.name,
            timezone: location.timezone,
            businessHours: location.businessHours,
          })),
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  // async getServices(locationId?: string) {
  //   try {
  //     const response = await this.squareClient.catalog.search({
  //       objectTypes: ['ITEM'],
  //       includeRelatedObjects: true,
  //     });

  //     const catalogItems = (response.objects ?? []) as any[];

  //     const services = catalogItems
  //       .filter((object) => object.itemData?.productType === 'APPOINTMENTS_SERVICE')
  //       .map((object) => {
  //         const variations = ((object.itemData?.variations ?? []) as any[])
  //           .filter((variation) => this.isVariationAvailableAtLocation(variation, locationId))
  //           .map((variation) => ({
  //             id: variation.id,
  //             version: variation.version,
  //             name: variation.itemVariationData?.name,
  //             durationMinutes: variation.itemVariationData?.serviceDuration
  //               ? Number(variation.itemVariationData.serviceDuration) / 60000
  //               : null,
  //             priceInCents: Number(variation.itemVariationData?.priceMoney?.amount ?? 0),
  //             currency: variation.itemVariationData?.priceMoney?.currency,
  //           }));

  //         return {
  //           id: object.id,
  //           name: object.itemData?.name,
  //           description: object.itemData?.description,
  //           variations,
  //         };
  //       })
  //       .filter((service) => service.variations.length > 0);

  //     return this.toJsonSafe({ data: services });
  //   } catch (error) {
  //     this.handleSquareError(error);
  //   }
  // }

  async getServices(locationId?: string) {
    try {
      // In the latest SDK, searchCatalogObjects is preferred over catalog.search
      const response = await this.squareClient.catalog.search({
        objectTypes: ['ITEM'],
        includeRelatedObjects: true,
        limit: 100, // Adjust as needed for pagination
      });

      const catalogItems = (response.objects ?? []) as any[];

      const services = catalogItems
        .filter((object) => object.itemData?.productType === 'APPOINTMENTS_SERVICE')
        .map((object) => {
          const variations = ((object.itemData?.variations ?? []) as any[])
            .filter((variation) => {
              // 1. Verify location suitability
              const isAtLocation = this.isVariationAvailableAtLocation(variation, locationId);

              // 2. CRUCIAL: Verify variation is explicitly flagged for customer online booking
              const isOnlineBookable = variation.itemVariationData?.availableForBooking === true;

              this.logger.debug(`Variation ${variation.id} at location ${locationId} is ${isOnlineBookable ? 'online bookable' : 'not online bookable'}`);

              return isAtLocation && isOnlineBookable;
            })
            .map((variation) => ({
              id: variation.id,
              version: variation.version,
              name: variation.itemVariationData?.name,
              durationMinutes: variation.itemVariationData?.serviceDuration
                ? Number(variation.itemVariationData.serviceDuration) / 60000
                : null,
              priceInCents: Number(variation.itemVariationData?.priceMoney?.amount ?? 0),
              currency: variation.itemVariationData?.priceMoney?.currency,
            }));

          return {
            id: object.id,
            name: object.itemData?.name,
            description: object.itemData?.description,
            variations,
          };
        })
        // Strip out any parent items whose variations were completely removed by the online booking filter
        .filter((service) => service.variations.length > 0);

      return this.toJsonSafe({ data: services });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  async getCartSummary(locationId: string, serviceVariationIds: string[]) {
    try {
      const response = await this.squareClient.catalog.batchGet({
        objectIds: serviceVariationIds,
        includeRelatedObjects: true,
      });

      const allObjects = [...(response.objects ?? []), ...(response.relatedObjects ?? [])] as any[];
      const objectById = new Map<string, any>(allObjects.map((obj) => [obj.id, obj]));

      const cartItems = serviceVariationIds.map((variationId) => {
        const variation = objectById.get(variationId);
        if (!variation?.itemVariationData) {
          throw new NotFoundException(`Service variation not found: ${variationId}`);
        }

        const parentItem = objectById.get(variation.itemVariationData.itemId ?? '');
        const durationMinutes = variation.itemVariationData.serviceDuration
          ? Number(variation.itemVariationData.serviceDuration) / 60000
          : 0;
        const amount = Number(variation.itemVariationData.priceMoney?.amount ?? 0);

        return {
          serviceVariationId: variation.id,
          serviceVariationVersion: variation.version,
          serviceName: parentItem?.itemData?.name,
          variationName: variation.itemVariationData.name,
          durationMinutes,
          priceInCents: amount,
          currency: variation.itemVariationData.priceMoney?.currency ?? 'USD',
        };
      });

      const subtotalInCents = cartItems.reduce((sum, item) => sum + item.priceInCents, 0);
      const totalDurationMinutes = cartItems.reduce((sum, item) => sum + item.durationMinutes, 0);

      return this.toJsonSafe({
        locationId,
        items: cartItems,
        summary: {
          subtotalInCents,
          totalDurationMinutes,
          currency: cartItems[0]?.currency ?? 'USD',
        },
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  async checkAvailability(
    locationId: string,
    serviceVariationIds: string[],
    date?: string,
    startAt?: string,
    endAt?: string,
  ) {
    try {
      const resolvedRange = this.resolveAvailabilityRange(date, startAt, endAt);

      const availabilityResponse = await this.squareClient.bookings.searchAvailability({
        query: {
          filter: {
            locationId,
            startAtRange: resolvedRange,
            segmentFilters: serviceVariationIds.map((serviceVariationId) => ({
              serviceVariationId,
            })),
          },
        },
      });

      // this.logger.debug(`Availability response for location ${locationId} and range ${JSON.stringify(resolvedRange)}:`, availabilityResponse);

      const availableSlots = [];
      for (const slot of availabilityResponse.availabilities ?? []) {
        const lockKey = this.getLockKey(locationId, slot.startAt ?? '');
        const isLocked = await this.cacheManager.get(lockKey);
        if (!isLocked) {
          availableSlots.push(slot);
        }
      }

      return this.toJsonSafe({
        locationId,
        range: resolvedRange,
        slots: availableSlots,
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  async lockTimeSlot(
    locationId: string,
    startAt: string,
    cartId: string,
    serviceVariationIds: string[],
  ) {
    const lockKey = this.getLockKey(locationId, startAt);
    const existingLock = await this.cacheManager.get<{
      lockToken: string;
      cartId: string;
      expiresAt: string;
    }>(lockKey);

    if (existingLock && existingLock.cartId !== cartId) {
      throw new ConflictException('This booking time is currently locked by another checkout session.');
    }

    const lockToken = randomUUID();
    const expiresAt = new Date(Date.now() + this.lockTtlMs).toISOString();

    await this.cacheManager.set(
      lockKey,
      {
        lockToken,
        cartId,
        locationId,
        startAt,
        serviceVariationIds,
        expiresAt,
      },
      this.lockTtlMs,
    );

    return {
      status: 'LOCKED',
      lockToken,
      cartId,
      expiresAt,
    };
  }

  async releaseLock(locationId: string, startAt: string, lockToken: string) {
    const lockKey = this.getLockKey(locationId, startAt);
    await this.assertLockOwnership(lockKey, lockToken);
    await this.cacheManager.del(lockKey);

    return {
      status: 'RELEASED',
      locationId,
      startAt,
    };
  }

  /**
   * 
   * @param payload 
   * @returns 
   * 
   * 1. In Your Sandbox / Testing Environment
    If your SquareClient configuration is pointing to SquareEnvironment.Sandbox, you can pass a standard testing token explicitly to bypass the frontend SDK framework:

    Use "cnon:card-nonce-ok" to simulate a successful standard payment.
    Use "cnon:card-nonce-declined" to test your rollback and failure handler logic.
   */
  async confirmBookingWithDeposit(payload: ConfirmBookingDto) {
    const lockKey = this.getLockKey(payload.locationId, payload.startAt);
    let createdBookingId: string | undefined;

    try {
      // await this.assertLockOwnership(lockKey, payload.lockToken);

      // 1. RESOLVE OR CREATE CUSTOMER ID (Crucial step to resolve the 'customer_id not found' error)
      let customerId: string | undefined;

      if (!customerId && payload.customerEmail) {
        // Search for an existing customer using their email address
        const searchResponse = await this.squareClient.customers.search({
          query: {
            filter: {
              emailAddress: {
                exact: payload.customerEmail,
              },
            },
          },
        });

        if (searchResponse.customers && searchResponse.customers.length > 0) {
          customerId = searchResponse.customers[0].id;
        } else {
          // If the customer does not exist, create a new customer profile
          const createCustomerResponse = await this.squareClient.customers.create({
            idempotencyKey: randomUUID(),
            givenName: payload.customerName?.split(' ')[0] || 'Guest',
            familyName: payload.customerName?.split(' ').slice(1).join(' ') || 'User',
            emailAddress: payload.customerEmail,
            phoneNumber: payload.customerPhone,
          });
          customerId = createCustomerResponse.customer?.id;
        }
      }

      if (!customerId) {
        throw new BadRequestException('A valid customer account or profile details are required to complete a booking.');
      }

      const appointmentSegments = payload.cartItems.map((item) => ({
        serviceVariationId: item.serviceVariationId,
        serviceVariationVersion: item.serviceVariationVersion
          ? BigInt(item.serviceVariationVersion)
          : undefined,
        teamMemberId: item.teamMemberId,
        durationMinutes: item.durationMinutes,
      }));

      const bookingResponse = await this.squareClient.bookings.create({
        idempotencyKey: randomUUID(),
        booking: {
          startAt: payload.startAt,
          locationId: payload.locationId,
          customerId: customerId,
          customerNote: JSON.stringify(payload.customFields ?? {}),
          appointmentSegments,
        },
      });

      createdBookingId = bookingResponse.booking?.id;

      const paymentResponse = await this.squareClient.payments.create({
        sourceId: payload.sourceId,
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: BigInt(payload.depositAmountInCents),
          currency: 'USD',
        },
        locationId: payload.locationId,
        autocomplete: true,
        referenceId: createdBookingId,
        note: `Deposit for booking ${createdBookingId}`,
      });

      // await this.cacheManager.del(lockKey);

      return this.toJsonSafe({
        booking: bookingResponse.booking,
        payment: paymentResponse.payment,
        customer: {
          name: payload.customerName,
          email: payload.customerEmail,
          phone: payload.customerPhone,
        },
      });
    } catch (error) {
      this.logger.error('Error during booking confirmation:', error);
      if (createdBookingId) {
        try {
          const getBooking = await this.squareClient.bookings.get({ bookingId: createdBookingId });
          await this.squareClient.bookings.cancel({
            bookingId: createdBookingId,
            idempotencyKey: randomUUID(),
            bookingVersion: Number(getBooking.booking?.version ?? 0),
          });
        } catch {
          // swallow rollback error and surface original checkout failure
        }
      }

      this.handleSquareError(error);
    }
  }

  async rescheduleBooking(bookingId: string, payload: RescheduleBookingDto) {
    const lockKey = this.getLockKey(payload.locationId, payload.newStartAt);

    try {
      await this.assertLockOwnership(lockKey, payload.lockToken);

      const existing = await this.squareClient.bookings.get({ bookingId });
      if (!existing.booking) {
        throw new NotFoundException('Booking not found.');
      }

      const updated = await this.squareClient.bookings.update({
        bookingId,
        idempotencyKey: randomUUID(),
        booking: {
          ...existing.booking,
          locationId: payload.locationId,
          startAt: payload.newStartAt,
        },
      });

      let feePayment = null;
      if ((payload.rescheduleFeeInCents ?? 0) > 0) {
        if (!payload.sourceId) {
          throw new BadRequestException('sourceId is required when rescheduleFeeInCents is greater than 0.');
        }

        const payment = await this.squareClient.payments.create({
          sourceId: payload.sourceId,
          idempotencyKey: randomUUID(),
          amountMoney: {
            amount: BigInt(payload.rescheduleFeeInCents ?? 0),
            currency: 'USD',
          },
          locationId: payload.locationId,
          referenceId: bookingId,
          note: `Reschedule fee for booking ${bookingId}`,
        });
        feePayment = payment.payment;
      }

      await this.cacheManager.del(lockKey);

      return this.toJsonSafe({
        booking: updated.booking,
        rescheduleFeePayment: feePayment,
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  async cancelBooking(bookingId: string, payload: CancelBookingDto) {
    try {
      const bookingResponse = await this.squareClient.bookings.get({ bookingId });
      if (!bookingResponse.booking) {
        throw new NotFoundException('Booking not found.');
      }

      const cancelResponse = await this.squareClient.bookings.cancel({
        bookingId,
        idempotencyKey: randomUUID(),
        bookingVersion: Number(bookingResponse.booking.version ?? 0),
      });

      let cancellationFeePayment = null;
      let refund = null;

      const cancellationFeeInCents = payload.cancellationFeeInCents ?? 0;
      const totalPaidInCents = payload.totalPaidInCents ?? 0;

      if (payload.originalPaymentId && totalPaidInCents > 0) {
        const refundableAmount = Math.max(totalPaidInCents - cancellationFeeInCents, 0);

        if (refundableAmount > 0) {
          const refundResponse = await this.squareClient.refunds.refundPayment({
            idempotencyKey: randomUUID(),
            paymentId: payload.originalPaymentId,
            amountMoney: {
              amount: BigInt(refundableAmount),
              currency: 'USD',
            },
            reason: payload.reason ?? `Refund for cancelled booking ${bookingId}`,
          });
          refund = refundResponse.refund;
        }
      }

      if (cancellationFeeInCents > 0 && payload.sourceId) {
        if (!payload.locationId) {
          throw new BadRequestException('locationId is required when collecting a cancellation fee.');
        }

        const feePaymentResponse = await this.squareClient.payments.create({
          sourceId: payload.sourceId,
          idempotencyKey: randomUUID(),
          amountMoney: {
            amount: BigInt(cancellationFeeInCents),
            currency: 'USD',
          },
          locationId: payload.locationId,
          referenceId: bookingId,
          note: `Cancellation fee for booking ${bookingId}`,
        });
        cancellationFeePayment = feePaymentResponse.payment;
      }

      return this.toJsonSafe({
        booking: cancelResponse.booking,
        cancellationFeePayment,
        refund,
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

  private resolveAvailabilityRange(date?: string, startAt?: string, endAt?: string) {
    if (startAt && endAt) {
      return { startAt, endAt };
    }

    if (!date) {
      throw new BadRequestException('Provide either date or both startAt and endAt.');
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    return {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  }

  private getLockKey(locationId: string, startAt: string) {
    return `lock:${locationId}:${startAt}`;
  }

  private async assertLockOwnership(lockKey: string, lockToken: string) {
    const lock = await this.cacheManager.get<{ lockToken: string; expiresAt: string }>(lockKey);
    if (!lock) {
      throw new ConflictException('Booking lock expired. Recheck availability and lock again.');
    }

    if (lock.lockToken !== lockToken) {
      throw new ConflictException('Invalid lock token for this booking time slot.');
    }
  }

  private isVariationAvailableAtLocation(variation: any, locationId?: string) {
    if (!locationId) {
      return true;
    }

    const presentAt = variation.presentAtLocationIds as string[] | undefined;
    const absentAt = variation.absentAtLocationIds as string[] | undefined;

    if (presentAt && presentAt.length > 0) {
      return presentAt.includes(locationId);
    }

    if (absentAt && absentAt.length > 0) {
      return !absentAt.includes(locationId);
    }

    return true;
  }

  private handleSquareError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error instanceof SquareError) {
      const details = error.errors
        ?.map((item) => item.detail ?? item.code)
        .filter(Boolean)
        .join(', ');
      throw new BadRequestException(`Square API Error: ${details || 'Unknown error'}`);
    }

    const message =
      (error as { message?: string })?.message ??
      'Unexpected error in Square booking workflow.';
    throw new BadRequestException(message);
  }

  private toJsonSafe<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) =>
        typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
      ),
    ) as T;
  }
}
