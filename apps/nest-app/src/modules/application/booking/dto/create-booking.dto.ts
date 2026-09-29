
export class CreateBookingDto {
  bookingData: {
    customerName: string;
    email: string;
    phone: string;
    serviceType: string;
    preferredDate: string;
    preferredTime: string;
    vehicleType?: string;
    notes?: string;
    source?: string;
  };
  paymentData: {
    squareToken: string;
    amount: number;
    currency?: string;
  };
}