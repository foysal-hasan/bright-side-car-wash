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
import { Currency, SquareClient, SquareEnvironment, SquareError } from 'square';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { GetServicesQueryDto } from './dto/get-services-query.dto';
import { DepositStatus, LeadPriority, PaymentStatus } from 'src/generated/prisma/enums';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { MailService } from 'src/mail/mail.service';


@Injectable()
export class SquareUpBookingService {
  private squareClient: SquareClient;
  private readonly lockTtlMs = 10 * 60 * 1000; // 10 minutes
  private readonly logger = new Logger(SquareUpBookingService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private prisma: PrismaService,
    private readonly mailService: MailService,
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
      const variationItem = (rootItem as any)?.itemData?.variations?.[0];

      return {
        message: 'Bookable service item generated successfully for all locations.',
        catalogItemId: rootItem?.id,
        serviceVariationId: variationItem?.id,
        version: variationItem?.version?.toString(), // Version number required by Bookings API
      };
    } catch (error) {
      // Square SDK errors expose raw responses inside an array structure
      // throw new BadRequestException(error.errors || error.message);
      this.handleSquareError(error);
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

  async getServices(query: GetServicesQueryDto) {
    try {
      // In the latest SDK, searchCatalogObjects is preferred over catalog.search
      const response = await this.squareClient.catalog.search({
        cursor: query.cursor || undefined,
        objectTypes: ['ITEM'],
        includeRelatedObjects: true,
        limit: query.limit || 100,
        query: {
          exactQuery: {
            attributeName: 'product_type',
            attributeValue: 'APPOINTMENTS_SERVICE',
          },
        },
      });

      const catalogItems = (response.objects ?? []) as any[];
      const relatedObjects = (response.relatedObjects ?? []) as any[];

      // Create a quick lookup map for image URLs by their Catalog ID
      const imageMap = new Map<string, string>();
      relatedObjects.forEach((obj) => {
        if (obj.type === 'IMAGE' && obj.imageData?.url) {
          imageMap.set(obj.id, obj.imageData.url);
        }
      });

      this.logger.debug(`Retrieved ${catalogItems.length} catalog items from Square.`);

      const resolveImageUrls = (ids: string[] | undefined): string[] => {
        if (!ids || !Array.isArray(ids)) return [];
        return ids
          .map((id) => imageMap.get(id))
          .filter((url): url is string => !!url);
      };

      const services = catalogItems
        // .filter((object) => object.itemData?.productType === 'APPOINTMENTS_SERVICE')
        .map((object) => {
          const variations = ((object.itemData?.variations ?? []) as any[])
            .filter((variation) => {
              // 1. Verify location suitability
              const isAtLocation = this.isVariationAvailableAtLocation(variation, query.locationId);

              // 2. CRUCIAL: Verify variation is explicitly flagged for customer online booking
              const isOnlineBookable = variation.itemVariationData?.availableForBooking === true;
              // this.logger.debug(`variation => ${this.toJsonSafe(variation.itemVariationData)}`);
              // console.log(variation)
              return isAtLocation && isOnlineBookable;
            })
            .map((variation) => {
              const variationImageIds = variation.itemVariationData?.imageIds
                ?? (variation.itemVariationData?.imageId ? [variation.itemVariationData.imageId] : []);

              return {
                id: variation.id,
                version: variation.version,
                name: variation.itemVariationData?.name,
                durationMinutes: variation.itemVariationData?.serviceDuration
                  ? Number(variation.itemVariationData.serviceDuration) / 60000
                  : null,
                priceInCents: Number(variation.itemVariationData?.priceMoney?.amount ?? 0),
                currency: variation.itemVariationData?.priceMoney?.currency,
                images: resolveImageUrls(variationImageIds),
              }
            });

          // Extract image URLs from the imageIds array present in your JSON payload
          const itemImageIds = object.itemData?.imageIds
            ?? (object.itemData?.imageId ? [object.itemData.imageId] : []);

          return {
            id: object.id,
            name: object.itemData?.name,
            description: object.itemData?.description,
            descriptionHtml: object.itemData?.descriptionHtml,
            variations,
            images: resolveImageUrls(itemImageIds),
          };
        })
        // Strip out any parent items whose variations were completely removed by the online booking filter
        .filter((service) => service.variations.length > 0);

      return this.toJsonSafe({ data: services, nextCursor: response.cursor || null });
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
      const totals = await this.calculateOrderTotals(locationId, serviceVariationIds);

      return this.toJsonSafe({
        locationId,
        items: cartItems,
        taxes: totals.order?.taxes ?? [],
        summary: {
          subtotalInCents,
          taxInCents: totals.taxInCents,
          totalInCents: totals.totalInCents > 0 ? totals.totalInCents : subtotalInCents + totals.taxInCents,
          totalDurationMinutes,
          currency: totals.currency || cartItems[0]?.currency || 'USD',
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

      const availableSlots = [];
      for (const slot of availabilityResponse.availabilities ?? []) {
        const lockKey = this.getLockKey(locationId, slot.startAt ?? '');
        const isLocked = await this.redis.get(lockKey);
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
    teamMemberId?: string,
  ) {
    const lockKey = this.getLockKey(locationId, startAt);

    // 1. Fetch existing lock from Redis
    const rawLock = await this.redis.get(lockKey);
    let existingLock: any = null;

    if (rawLock) {
      try {
        existingLock = JSON.parse(rawLock);
      } catch (e) {
        this.logger.error('Failed to parse redis lock string payload', e);
      }
    }

    if (existingLock) {
      if (existingLock.cartId !== cartId) {
        throw new ConflictException('This booking time is currently locked by another checkout session.');
      }
      if (existingLock.cartId === cartId) {
        throw new ConflictException('This booking time is already locked by your current session.');
      }
    }

    try {
      // 2. Validate against Square's real-time calendar availability engine
      const requestedTime = new Date(startAt);
      const startRangeMin = new Date(requestedTime.getTime() - 60 * 60 * 1000).toISOString();
      const startRangeMax = new Date(requestedTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const availabilityResponse = await this.squareClient.bookings.searchAvailability({
        query: {
          filter: {
            startAtRange: { startAt: startRangeMin, endAt: startRangeMax },
            locationId,
            segmentFilters: serviceVariationIds.map((id) => ({
              serviceVariationId: id,
              teamMemberId: teamMemberId || undefined,
            })),
          },
        },
      });

      const availableSlots = availabilityResponse.availabilities ?? [];
      const isSlotAvailable = availableSlots.some(
        (slot: any) => new Date(slot.startAt).getTime() === requestedTime.getTime()
      );

      if (!isSlotAvailable) {
        throw new ConflictException('The requested time slot is no longer available in the master calendar schedule.');
      }
    } catch (error) {
      this.logger.error('Availability check failed during lock initialization:', error);
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Could not verify calendar slot status with the booking server.');
    }

    // 4. Time slot is authenticated and free -> apply atomic Redis TTL lock
    const lockToken = randomUUID();
    const expiresAt = new Date(Date.now() + this.lockTtlMs).toISOString();

    const lockData = {
      lockToken,
      cartId,
      locationId,
      startAt,
      serviceVariationIds,
      expiresAt,
    };

    // 'PX' sets the TTL specifically in milliseconds via ioredis
    await this.redis.set(lockKey, JSON.stringify(lockData), 'PX', this.lockTtlMs);

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

    await this.redis.del(lockKey);

    return {
      status: 'RELEASED',
      locationId,
      startAt,
    };
  }

  private async assertLockOwnership(lockKey: string, lockToken: string) {
    const rawLock = await this.redis.get(lockKey);
    if (!rawLock) {
      throw new ConflictException('Booking lock expired. Recheck availability and lock again.');
    }

    const lock = JSON.parse(rawLock);
    if (lock.lockToken !== lockToken) {
      throw new ConflictException('Invalid lock token for this booking time slot.');
    }
  }


  async getTaxes(locationId: string, serviceVariationIds: string[]) {
    try {
      const totals = await this.calculateOrderTotals(locationId, serviceVariationIds);

      this.logger.debug(
        `Calculated taxes for variations: ${serviceVariationIds.join(', ')} => ${JSON.stringify(
          this.toJsonSafe(totals.order),
        )}`,
      );

      return this.toJsonSafe({
        data: totals.order?.taxes ?? [],
        summary: {
          subtotalInCents: totals.subtotalInCents,
          taxInCents: totals.taxInCents,
          totalInCents: totals.totalInCents,
          currency: totals.currency,
        },
      });
    } catch (error) {
      this.handleSquareError(error);
    }
  }

// cnon:card-nonce-ok for test sendbox payment
  async confirmBookingWithDeposit(payload: ConfirmBookingDto) {
    const lockKey = this.getLockKey(payload.locationId, payload.startAt);
    let createdBookingId: string | undefined;
    let createdLeadId: string | undefined;
    let calculatedSubtotalCostCents = 0;
    let calculatedTaxCostCents = 0;
    let calculatedTotalCostCents = 0;
    let calculatedCurrency: Currency = Currency.Usd;

    try {
      await this.assertLockOwnership(lockKey, payload.lockToken);

      const rawCachedLockData = await this.redis.get(lockKey);
      const cachedLockData = rawCachedLockData ? JSON.parse(rawCachedLockData) : null;
      if (!cachedLockData || cachedLockData.startAt !== payload.startAt) {
        throw new BadRequestException('Tampering detected: Payload time slot does not match locked slot.');
      }

      // 1. RESOLVE OR CREATE CUSTOMER ID FROM SQUARE
      let customerId: string | undefined;
      if (payload.customerEmail) {
        const searchResponse = await this.squareClient.customers.search({
          query: { filter: { emailAddress: { exact: payload.customerEmail } } },
        });

        if (searchResponse.customers && searchResponse.customers.length > 0) {
          customerId = searchResponse.customers[0].id;
        } else {
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
        throw new BadRequestException('A valid customer profile is required.');
      }

      // 2. SECURE BACKEND VALIDATION & VARIATION PARSING
      const variationIds = payload.cartItems.map((item) => item.serviceVariationId);

      // 1. CRITICAL: Include related objects to fetch parent items along with variations
      const catalogResponse = await this.squareClient.catalog.batchGet({
        objectIds: variationIds,
        includeRelatedObjects: true // ◄— Added this
      });

      const fetchedObjects = catalogResponse.objects ?? [];
      const catalogMap = new Map<string, any>(fetchedObjects.map((obj) => [obj.id, obj]));

      // 2. Map the related parent items by their ID for lightning-fast lookup
      const relatedObjectsMap = new Map<string, any>(
        (catalogResponse.relatedObjects ?? []).map((obj) => [obj.id, obj])
      );


      const serviceNamesArray: string[] = [];

      const appointmentSegments = payload.cartItems.map((item) => {
        const catalogVariation = catalogMap.get(item.serviceVariationId);
        if (!catalogVariation || catalogVariation.type !== 'ITEM_VARIATION') {
          throw new BadRequestException(`The service variation ID ${item.serviceVariationId} is invalid.`);
        }

        const variationData = catalogVariation.itemVariationData;

        const backendDurationMinutes = variationData?.serviceDuration
          ? Number(variationData.serviceDuration) / 60000
          : 30;

        // 3. STITCH PARENT AND VARIATION NAMES TOGETHER
        if (variationData?.name) {
          const parentItemId = variationData.itemId;
          const parentItem = relatedObjectsMap.get(parentItemId);
          const parentName = parentItem?.itemData?.name || 'Unknown Service';
          const variationName = variationData.name; // e.g., "Regular Session"

          // Generates cleanly: "Express Detail Interior - Sedan/ SUV (Regular Session) - (60 min)"
          serviceNamesArray.push(`${parentName} (${variationName}) - (${backendDurationMinutes} min)`);
        }

        calculatedSubtotalCostCents += Number(variationData?.priceMoney?.amount ?? 0);

        return {
          serviceVariationId: item.serviceVariationId,
          serviceVariationVersion: catalogVariation.version,
          teamMemberId: item.teamMemberId,
          durationMinutes: backendDurationMinutes,
        };
      });

      if (calculatedSubtotalCostCents <= 0) {
        throw new BadRequestException('Invalid deposit calculation metrics detected.');
      }

      const totals = await this.calculateOrderTotals(payload.locationId, variationIds);
      calculatedTaxCostCents = totals.taxInCents;
      calculatedTotalCostCents = totals.totalInCents > 0
        ? totals.totalInCents
        : calculatedSubtotalCostCents + calculatedTaxCostCents;
      calculatedCurrency = totals.currency;

      if (calculatedTotalCostCents <= 0) {
        throw new BadRequestException('Invalid total charge calculation metrics detected.');
      }

      // 3. PERSIST INITIAL INTENT (Isolated Function)
      createdLeadId = await this.createInitialLead(
        payload,
        serviceNamesArray,
        calculatedTotalCostCents,
        calculatedCurrency,
        calculatedTaxCostCents,
      );

      // 4. COMMENCE UPSTREAM ENTITY CREATION IN SQUARE
      const bookingResponse = await this.squareClient.bookings.create({
        idempotencyKey: randomUUID(),
        booking: {
          startAt: payload.startAt,
          locationId: payload.locationId,
          customerId: customerId,
          customerNote: payload.customerNote ?? '',
          appointmentSegments,
        },
      });

      createdBookingId = bookingResponse.booking?.id;

      // 5. PROCESS CHARGE VIA SQUARE PAYMENTS
      const paymentResponse = await this.squareClient.payments.create({
        sourceId: payload.sourceId,
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: BigInt(calculatedTotalCostCents),
          currency: calculatedCurrency,
        },
        locationId: payload.locationId,
        autocomplete: true,
        referenceId: createdBookingId,
        note: `Secure deposit for booking ${createdBookingId} (subtotal: ${(calculatedSubtotalCostCents / 100).toFixed(2)}, tax: ${(calculatedTaxCostCents / 100).toFixed(2)})`,
      });


      // 6. PROCESS SUCCESSFUL CONVERSION (Isolated Function)
      if (createdLeadId) {
        await this.handleLeadConversion(
          createdLeadId,
          createdBookingId,
          paymentResponse.payment?.id,
          calculatedTotalCostCents,
          calculatedCurrency,
          calculatedTaxCostCents,
        );
      }

      if (payload.customerEmail && createdBookingId) {
        await this.mailService.sendBookingConfirmationEmail({
          to: payload.customerEmail,
          customerName: payload.customerName,
          bookingId: createdBookingId,
          startAt: payload.startAt,
          services: serviceNamesArray,
          totalCostCents: calculatedTotalCostCents,
          currency: calculatedCurrency,
        });
      }

      // Evict cache lock immediately on success
      await this.redis.del(lockKey).catch(() => { });

      return this.toJsonSafe({
        booking: bookingResponse.booking,
        payment: paymentResponse.payment,
        customer: {
          name: payload.customerName,
          email: payload.customerEmail,
          phone: payload.customerPhone,
        },
        pricing: {
          subtotalInCents: calculatedSubtotalCostCents,
          taxInCents: calculatedTaxCostCents,
          totalInCents: calculatedTotalCostCents,
          currency: calculatedCurrency,
        },
      });
    } catch (error) {
      this.logger.error('Secure booking orchestration failure:', error);

      // 7. HANDLE DROPPED/FAILED CHECKOUT (Isolated Function)
      if (createdLeadId) {
        await this.handleLeadFailure(
          createdLeadId,
          error,
          calculatedTotalCostCents,
          calculatedCurrency,
          calculatedTaxCostCents,
        );
      }

      // Auto-rollback Square booking if payment failed
      if (createdBookingId) {
        try {
          const getBooking = await this.squareClient.bookings.get({ bookingId: createdBookingId });
          await this.squareClient.bookings.cancel({
            bookingId: createdBookingId,
            idempotencyKey: randomUUID(),
            bookingVersion: Number(getBooking.booking?.version ?? 0),
          });
        } catch {
          // Suppress rollback failures to bubble original checkout exceptions
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

      await this.redis.del(lockKey);

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



    this.logger.debug(`Variation ${variation.id} => ${variation}`);


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

  private parseMoneyAmount(amount: unknown): number {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'bigint') return Number(amount);
    if (typeof amount === 'string') {
      const parsed = Number(amount);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private async calculateOrderTotals(locationId: string, serviceVariationIds: string[]) {
    const data = await this.squareClient.orders.calculate({
      order: {
        locationId,
        lineItems: serviceVariationIds.map((id) => ({
          catalogObjectId: id,
          quantity: '1',
        })),
        pricingOptions: {
          autoApplyTaxes: true,
        }
      },
    });

    const order = data.order;
    const subtotalInCents = (order?.lineItems ?? []).reduce((sum, item: any) => {
      const amount = this.parseMoneyAmount(
        item.grossSalesMoney?.amount ??
          item.variationTotalPriceMoney?.amount ??
          item.basePriceMoney?.amount ??
          0,
      );
      return sum + amount;
    }, 0);

    const taxInCents = this.parseMoneyAmount(
      order?.totalTaxMoney?.amount ?? order?.netAmounts?.taxMoney?.amount ?? 0,
    );

    const fallbackTotal = subtotalInCents + taxInCents;
    const totalInCents = this.parseMoneyAmount(order?.totalMoney?.amount ?? fallbackTotal);
    const currency =
      order?.totalMoney?.currency ??
      order?.totalTaxMoney?.currency ??
      order?.lineItems?.[0]?.totalMoney?.currency ??
      'USD';

    return {
      order,
      subtotalInCents,
      taxInCents,
      totalInCents,
      currency,
    };
  }


  private async createInitialLead(
    payload: ConfirmBookingDto,
    serviceNames: string[],
    totalCostCents: number,
    depositCurrency: string = 'USD',
    taxInCents: number = 0,
  ): Promise<string | undefined> {
    if (!payload.customerEmail) {
      this.logger.warn('Skipping unique lead checks because email address is missing.');
      return undefined;
    }

    try {
      // 1. FAST PATH CHECK: If it already exists, return it immediately without any updates
      const existingLead = await this.prisma.lead.findUnique({
        where: { email: payload.customerEmail },
        select: { id: true }
      });

      if (existingLead) {
        this.logger.log(`Lead already exists for email ${payload.customerEmail}. Skipping all database changes.`);
        return existingLead.id;
      }

      // 2. FETCH OR CREATE THE TARGET STAGE (Only for a brand new record)
      const targetStage = await this.prisma.stage.upsert({
        where: { name: 'New' },
        update: {},
        create: { name: 'New', color: '#0098E8' },
      });

      const costSummaryText = `$${(totalCostCents / 100).toFixed(2)}`;
      const taxSummaryText = `$${(taxInCents / 100).toFixed(2)}`;
      const subtotalSummaryText = `$${((totalCostCents - taxInCents) / 100).toFixed(2)}`;
      const serviceSummary = serviceNames.join(', ') || 'Online Booking Service';

      // 3. ATTEMPT TO CREATE A FRESH LEAD
      const leadRecord = await this.prisma.lead.create({
        data: {
          name: payload.customerName,
          email: payload.customerEmail,
          phone: payload.customerPhone,
          service: serviceSummary,
          source: 'Online Booking Widget',
          deposit_status: DepositStatus.PENDING,
          priority: LeadPriority.LOW,
          stage_id: targetStage.id,
          vehicle: payload.vehicle,
          deposit_amount: totalCostCents,
          deposit_currency: depositCurrency,
          notes: [
            `Checkout session initiated via web. Subtotal: ${subtotalSummaryText}, Tax: ${taxSummaryText}, Total: ${costSummaryText}`,
          ],
          activity_timelines: {
            create: {
              description: `User started checkout for appointment at ${payload.startAt}`,
              source: 'SYSTEM_CHECKOUT',
            },
          },
        },
      });

      return leadRecord.id;
    } catch (dbError) {
      this.logger.error('Failed to process conditional lead entry synchronization:', dbError);
      return undefined;
    }
  }

  private async handleLeadConversion(
    leadId: string,
    bookingId: string | undefined,
    paymentId: string | undefined,
    totalCostCents: number,
    currency: string = 'USD',
    taxInCents: number = 0,
  ): Promise<void> {
    try {
      const currentLead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { deposit_status: true, name: true, service: true }
      });

      if (currentLead?.deposit_status === DepositStatus.PAID) {
        return;
      }

      // Reference identifier falls back cleanly to prevent primary key failures
      const secureTxnId = paymentId || `TXN-FALLBACK-${randomUUID().substring(0, 8).toUpperCase()}`;

      await this.prisma.$transaction([
        // Update core lead fields
        this.prisma.lead.update({
          where: { id: leadId },
          data: {
            deposit_status: DepositStatus.PAID,
            notes: {
              push: `Payment successful. Square ID: ${paymentId}. Booking ID: ${bookingId}. Tax: $${(taxInCents / 100).toFixed(2)}.`,
            },
          },
        }),
        // Generate transaction entry mapping to image_15eb60.png data layout
        this.prisma.payment.create({
          data: {
            transaction_id: secureTxnId,
            customer_name: currentLead?.name || 'Guest User',
            service: currentLead?.service || 'Online Booking',
            amount: totalCostCents,
            currency: currency,
            status: PaymentStatus.PAID,
            lead_id: leadId
          }
        }),
        this.prisma.leadActivityTimeline.create({
          data: {
            lead_id: leadId,
            description: `Deposit received successfully. Converted lead to appointment.`,
            source: 'SYSTEM_PAYMENT',
          },
        }),
        this.prisma.activityLog.create({
          data: {
            action: 'UPDATE',
            entity: 'Lead',
            entityId: leadId,
            description: `Online client successfully paid deposit and secured booking ${bookingId}`,
            metadata: { bookingId, paymentId },
          },
        }),
      ]);
    } catch (err) {
      this.logger.error('Failed to update converted lead database states:', err);
    }
  }

  private async handleLeadFailure(
    leadId: string,
    error: any,
    totalCostCents: number,
    currency: string = 'USD',
    taxInCents: number = 0,
  ): Promise<void> {
    try {
      const currentLead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { deposit_status: true, name: true, service: true }
      });

      if (currentLead?.deposit_status === DepositStatus.PAID) {
        return;
      }

      const failedStage = await this.prisma.stage.upsert({
        where: { name: 'Abandoned Checkout' },
        update: {},
        create: { name: 'Abandoned Checkout', color: '#FF0000' },
      });

      const failedTxnId = `TXN-FAIL-${randomUUID().substring(0, 8).toUpperCase()}`;

      await this.prisma.$transaction([
        this.prisma.lead.update({
          where: { id: leadId },
          data: {
            deposit_status: DepositStatus.FAILED,
            stage_id: failedStage.id,
          },
        }),
        // Create a record of the failed transaction attempt
        this.prisma.payment.create({
          data: {
            transaction_id: failedTxnId,
            customer_name: currentLead?.name || 'Guest User',
            service: currentLead?.service || 'Online Booking',
            amount: totalCostCents,
            currency: currency,
            status: PaymentStatus.FAILED,
            lead_id: leadId
          }
        }),
        this.prisma.leadActivityTimeline.create({
          data: {
            lead_id: leadId,
            description: `Checkout step aborted or failed. Tax at failure time: $${(taxInCents / 100).toFixed(2)}.`,
            source: 'SYSTEM_EXCEPTIONS',
          },
        }),
      ]);
    } catch (dbError) {
      this.logger.error('Failed to mark lead as failed/abandoned:', dbError);
    }
  }

}
