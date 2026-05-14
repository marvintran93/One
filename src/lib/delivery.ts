export const DELIVERY_MIN_SUBTOTAL_CENTS = 100_00;

export interface DeliveryQuote {
  available: boolean;
  miles: number | null;
  feeCents: number;
  reason?: string;
}

export function deliveryFeeForMiles(miles: number): DeliveryQuote {
  if (!Number.isFinite(miles) || miles < 0) {
    return { available: false, miles: null, feeCents: 0, reason: "Could not determine distance." };
  }
  if (miles <= 5) return { available: true, miles, feeCents: 5_00 };
  if (miles <= 10) return { available: true, miles, feeCents: 10_00 };
  if (miles <= 15) return { available: true, miles, feeCents: 15_00 };
  return {
    available: false,
    miles,
    feeCents: 0,
    reason: "Outside our delivery radius. Local pickup is available."
  };
}
