import { Injectable, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SquareClient, SquareEnvironment, SquareError } from 'square';
import appConfig from 'src/config/app.config';

@Injectable()
export class SquareBookingService {
    private squareClient: SquareClient;

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
        // Initializing using the latest modern SDK client architecture
        this.squareClient = new SquareClient({
            token: appConfig().square.accessToken,
            environment: appConfig().square.environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
        });
    }

    // 1. Fetch Business Locations
    async getLocations() {
        try {
            await this.createBookingService();
            const response = await this.squareClient.locations.list();
            return response.locations?.map(loc => ({
                id: loc.id,
                name: loc.name,
                address: loc.address,
            })) || [];
        } catch (error) {
            this.handleSquareError(error);
        }
    }

    async createBookingService() {
    try {
        const response = await this.squareClient.catalog.object.upsert({
            idempotencyKey: "unique-service-key-v1",
            object: {
                type: "ITEM",
                id: "#new-service", // Temporary ID used for upserting
                itemData: {
                    name: "Premium Consultation",
                    description: "Initial strategy session. Requires a 50% deposit.",
                    productType: "APPOINTMENTS_SERVICE", // Crucial for bookings!
                    variations: [
                        {
                            type: "ITEM_VARIATION",
                            id: "#new-service-var",
                            itemVariationData: {
                                name: "Regular Session",
                                pricingType: "FIXED_PRICING",
                                priceMoney: {
                                    amount: BigInt(10000), // $100.00 (in cents)
                                    currency: "USD"
                                },
                                // Defines how long the appointment takes
                                serviceDuration: BigInt(3600000) // 60 minutes in milliseconds
                            }
                        }
                    ]
                }
            }
        });

        const variation = response.catalogObject?.itemData?.variations?.[0];
        console.log("Service Created Successfully!");
        console.log(`Service Variation ID: ${variation?.id}`);
        console.log(`Version: ${variation?.version}`);
        
        return { id: variation?.id, version: variation?.version };
    } catch (error) {
        console.error("Error creating service:", error);
    }
}

    // 1. Fetch Dynamic Services List mapped to the Catalog API structure
    async getServices() {
        try {
            // Fetch both service catalog items and retrieve cross-referenced objects (like Categories)
            const response = await this.squareClient.catalog.list({
                
            });

            console.log('🔵 [BACKEND] Square Catalog API response:', response.data);

            // Build a quick map lookup dictionary for category names from related_objects
            //   const categoryMap = new Map<string, string>();
            //   response.relatedObjects?.forEach(obj => {
            //     if (obj.type === 'CATEGORY' && obj.categoryData?.name) {
            //       categoryMap.set(obj.id, obj.categoryData.name);
            //     }
            //   });

            //   return response.objects?.map(obj => {
            //     const firstCategory = obj.itemData?.categories?.[0]?.id || '';

            //     return {
            //       id: obj.id, // The parent item ID (e.g., "W62UWFY35CWMYGVWK6TWJDNI")
            //       name: obj.item_data[0]?.name,
            //       description: obj.item_data[0]?.description,
            //       categoryName: categoryMap.get(firstCategory) || 'General Services',
            //       variations: obj.item_data[0]?.variations?.map(v => ({
            //         id: v.id, // The critical variation ID used for booking/cart (e.g., "2TZFAOHWGG7PAK2QEXWYPZSP")
            //         name: v.item_variation_data?.name, // e.g., "Sedan" or "Mug"
            //         // Defaulting car wash detailing durations if custom field isn't set
            //         durationMinutes: v.item_variation_data?.serviceDuration 
            //           ? Number(v.item_variation_data.serviceDuration) 
            //           : 60, 
            //         price: Number(v.item_variation_data?.priceMoney?.amount || 0) / 100,
            //         currency: v.item_variation_data?.priceMoney?.currency || 'USD'
            //       })),
            //     };
            //   }) || [];

            const appointmentsServices = response.data.map((obj: any) => {
                if (obj.itemData?.productType !== 'APPOINTMENTS_SERVICE') {
                    return null; // Skip non-service items
                }

                return {
                    type: obj.type,
                    created_at: obj.created_at,
                    name: obj.itemData?.name,
                    description: obj.itemData?.description || '',
                    id: obj.id,
                    product_type: obj.itemData?.productType,
                    variations: obj.itemData?.variations?.map((v: any) => ({
                        id: v.id,
                        name: v.itemVariationData?.name,
                        durationMinutes: v.itemVariationData?.serviceDuration
                            ? Number(v.itemVariationData.serviceDuration)
                            : 60,
                        price: Number(v.itemVariationData?.priceMoney?.amount || 0) / 100,
                        currency: v.itemVariationData?.priceMoney?.currency || 'USD',
                    })),
                }
            }) || [];

            return appointmentsServices.filter((s: any) => s !== null);

        } catch (error) {
            this.handleSquareError(error);
        }
    }

    // 3. Search Availability for Multiple Items (Combined Cart)
    async checkAvailability(locationId: string, serviceVariationIds: string[], startAt: string, endAt: string) {
        try {
            const response = await this.squareClient.bookings.searchAvailability({
                query: {
                    filter: {
                        startAtRange: { startAt, endAt },
                        locationId,
                        segmentFilters: serviceVariationIds.map(id => ({ serviceVariationId: id })),
                    },
                },
            });

            // Filter out slots that currently have a 10-minute hold in your DB/Redis cache
            const availableSlots = [];
            for (const slot of response.availabilities || []) {
                const lockKey = `lock:${locationId}:${slot.startAt}`;
                const isLocked = await this.cacheManager.get(lockKey);
                if (!isLocked) {
                    availableSlots.push(slot);
                }
            }
            return availableSlots;
        } catch (error) {
            this.handleSquareError(error);
        }
    }

    // 4. Place a 10-Minute Lock (Local Memory Hold)
    async lockTimeSlot(locationId: string, startAt: string, cartId: string) {
        const lockKey = `lock:${locationId}:${startAt}`;
        const existingLock = await this.cacheManager.get(lockKey);

        if (existingLock && existingLock !== cartId) {
            throw new ConflictException('This booking window is temporarily held by another customer.');
        }

        // Set 10 minutes local lock duration (600,000 milliseconds)
        await this.cacheManager.set(lockKey, cartId, 600000);
        return { status: 'Locked', expiresAt: Date.now() + 600000 };
    }

    // 5. Checkout Transaction: Take Deposit + Save to Live Appointments Calendar
    async confirmBookingWithDeposit(payload: {
        locationId: string;
        startAt: string;
        cartItems: Array<{ serviceVariationId: string; durationMinutes: number }>;
        sourceId: string; // Credit card nonce from Next.js Payments SDK
        depositAmountInCents: number;
    }) {
        let createdBookingId: string | undefined;

        try {
            const appointmentSegments = payload.cartItems.map(item => ({
                serviceVariationId: item.serviceVariationId,
                durationMinutes: item.durationMinutes,
            }));

            // Step A: Create Booking on the official Dashboard Calendar
            const bookingResponse = await this.squareClient.bookings.create({
                booking: {
                    startAt: payload.startAt,
                    locationId: payload.locationId,
                    appointmentSegments,
                },
            });

            createdBookingId = bookingResponse.booking?.id;

            // Step B: Charge the Deposit Amount via Payments API
            const paymentResponse = await this.squareClient.payments.create({
                sourceId: payload.sourceId,
                idempotencyKey: `pay-${createdBookingId}-${Date.now()}`,
                amountMoney: {
                    amount: BigInt(payload.depositAmountInCents),
                    currency: 'USD',
                },
                referenceId: createdBookingId, // Attaches clean billing relationship in Square reporting
            });

            // Step C: Clear the local hold since transaction passed successfully
            await this.cacheManager.del(`lock:${payload.locationId}:${payload.startAt}`);

            return {
                booking: bookingResponse.booking,
                paymentId: paymentResponse.payment?.id,
            };

        } catch (error) {
            // Rollback safety fallback: If payment fails, delete/cancel booking so calendar updates correctly
            if (createdBookingId) {
                try {
                    await this.squareClient.bookings.cancelBooking(createdBookingId, {});
                } catch (cancelError) {
                    console.error(`Failed to cancel orphaned booking ID: ${createdBookingId}`, cancelError);
                }
            }
            this.handleSquareError(error);
        }
    }

    // Helper function to extract diagnostic messages from latest SquareError throws
    private handleSquareError(error: any) {
        console.error('Square API Error:', error);
        if (error instanceof SquareError) {
            const errorDetails = error.errors.map(e => e.detail).join(', ');
            throw new BadRequestException(`Square API Error: ${errorDetails}`);
        }
        throw new BadRequestException(error.message || 'An unexpected error occurred during scheduling processing.');
    }
}