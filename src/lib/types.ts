export type GarmentSize = "S" | "M" | "L" | "XL";

export type UserRole = "customer" | "admin" | "courier";
export type AccountStatus = "pending" | "approved" | "denied";

export type FulfillmentKind = "delivery" | "pickup";
export type OrderStatus =
  | "received"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  role: UserRole;
  status: AccountStatus;
  referral_code: string | null;
  invite_code_used: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface ProductSize {
  product_id: string;
  size: GarmentSize;
  price_cents: number;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  color_accent: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  sizes: ProductSize[];
}

export interface CartLine {
  product_id: string;
  product_name: string;
  color_accent: string;
  size: GarmentSize;
  unit_price_cents: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  size: GarmentSize;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface Order {
  id: string;
  customer_id: string;
  fulfillment: FulfillmentKind;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  delivery_distance_miles: number | null;
  delivery_window: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  courier_id: string | null;
  customer_note: string | null;
  created_at: string;
  updated_at: string;
}

export const DELIVERY_WINDOWS = [
  "10am – 12pm",
  "12pm – 2pm",
  "2pm – 4pm",
  "4pm – 6pm"
] as const;
export type DeliveryWindow = (typeof DELIVERY_WINDOWS)[number];

export const SIZES: GarmentSize[] = ["S", "M", "L", "XL"];
