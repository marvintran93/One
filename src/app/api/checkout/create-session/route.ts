import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchDrivingDistanceMiles } from "@/lib/distance";
import { DELIVERY_MIN_SUBTOTAL_CENTS, deliveryFeeForMiles } from "@/lib/delivery";
import { getStripe } from "@/lib/stripe";
import type { GarmentSize } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LineSchema = z.object({
  product_id: z.string().uuid(),
  size: z.enum(["S", "M", "L", "XL"]),
  quantity: z.number().int().min(1).max(50)
});

const BodySchema = z.object({
  lines: z.array(LineSchema).min(1),
  fulfillment: z.enum(["delivery", "pickup"]),
  delivery: z
    .object({
      address_line1: z.string().min(1),
      address_line2: z.string().nullable().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postal_code: z.string().min(1),
      window: z.string().min(1)
    })
    .nullable()
    .optional(),
  customer_note: z.string().max(2000).nullable().optional()
});

export async function POST(req: Request) {
  const session = await getSessionAndProfile();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.profile.status !== "approved") {
    return NextResponse.json({ error: "account not approved" }, { status: 403 });
  }
  if (session.profile.role !== "customer") {
    return NextResponse.json({ error: "wrong role" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (body.fulfillment === "delivery" && !body.delivery) {
    return NextResponse.json({ error: "delivery address required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Re-price every line from the DB to prevent client tampering.
  const productIds = Array.from(new Set(body.lines.map((l) => l.product_id)));
  const [{ data: products, error: prodErr }, { data: sizes, error: sizesErr }] = await Promise.all([
    admin.from("products").select("id,name,active").in("id", productIds),
    admin.from("product_sizes").select("product_id,size,price_cents,available").in("product_id", productIds)
  ]);
  if (prodErr || sizesErr) {
    console.error(prodErr || sizesErr);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const sizeMap = new Map<string, { price_cents: number; available: boolean }>();
  for (const s of sizes ?? []) {
    sizeMap.set(`${s.product_id}:${s.size}`, { price_cents: s.price_cents, available: s.available });
  }

  let subtotal = 0;
  const itemsForOrder: Array<{
    product_id: string;
    product_name_snapshot: string;
    size: GarmentSize;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }> = [];

  for (const line of body.lines) {
    const product = productMap.get(line.product_id);
    if (!product || !product.active) {
      return NextResponse.json({ error: "item unavailable" }, { status: 400 });
    }
    const sz = sizeMap.get(`${line.product_id}:${line.size}`);
    if (!sz || !sz.available) {
      return NextResponse.json({ error: "size unavailable" }, { status: 400 });
    }
    const lineTotal = sz.price_cents * line.quantity;
    subtotal += lineTotal;
    itemsForOrder.push({
      product_id: line.product_id,
      product_name_snapshot: product.name,
      size: line.size,
      quantity: line.quantity,
      unit_price_cents: sz.price_cents,
      line_total_cents: lineTotal
    });
  }

  let deliveryFeeCents = 0;
  let miles: number | null = null;
  let deliveryWindow: string | null = null;
  const d = body.delivery ?? null;

  if (body.fulfillment === "delivery") {
    if (subtotal < DELIVERY_MIN_SUBTOTAL_CENTS) {
      return NextResponse.json({ error: "below delivery minimum" }, { status: 400 });
    }
    try {
      const dest = `${d!.address_line1}, ${d!.city}, ${d!.state} ${d!.postal_code}`;
      const r = await fetchDrivingDistanceMiles(dest);
      miles = r.miles;
    } catch (err) {
      console.error("[create-session:distance]", err);
      return NextResponse.json({ error: "could not verify delivery address" }, { status: 400 });
    }
    const q = deliveryFeeForMiles(miles!);
    if (!q.available) {
      return NextResponse.json({ error: q.reason ?? "delivery unavailable" }, { status: 400 });
    }
    deliveryFeeCents = q.feeCents;
    deliveryWindow = d!.window;
  }

  const total = subtotal + deliveryFeeCents;

  // Insert order + items
  const { data: orderInsert, error: orderErr } = await admin
    .from("orders")
    .insert({
      customer_id: session.userId,
      fulfillment: body.fulfillment,
      address_line1: d?.address_line1 ?? null,
      address_line2: d?.address_line2 ?? null,
      city: d?.city ?? null,
      state: d?.state ?? null,
      postal_code: d?.postal_code ?? null,
      delivery_distance_miles: miles,
      delivery_window: deliveryWindow,
      subtotal_cents: subtotal,
      delivery_fee_cents: deliveryFeeCents,
      total_cents: total,
      status: "received",
      payment_status: "pending",
      payment_method: "stripe",
      customer_note: body.customer_note ?? null
    })
    .select("id")
    .single();
  if (orderErr || !orderInsert) {
    console.error(orderErr);
    return NextResponse.json({ error: "order create failed" }, { status: 500 });
  }
  const orderId = orderInsert.id;

  const { error: itemsErr } = await admin.from("order_items").insert(
    itemsForOrder.map((i) => ({ ...i, order_id: orderId }))
  );
  if (itemsErr) {
    console.error(itemsErr);
    return NextResponse.json({ error: "order items create failed" }, { status: 500 });
  }

  // Stripe Checkout session
  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const lineItems = itemsForOrder.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: "usd",
      unit_amount: i.unit_price_cents,
      product_data: {
        name: `${i.product_name_snapshot} — ${i.size}`
      }
    }
  }));
  if (deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: deliveryFeeCents,
        product_data: { name: "Delivery" }
      }
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: session.profile.email,
    payment_intent_data: {
      statement_descriptor_suffix: (process.env.NEXT_PUBLIC_BILLING_DESCRIPTOR ?? "LDC").slice(0, 22),
      metadata: { order_id: orderId }
    },
    metadata: { order_id: orderId, customer_id: session.userId },
    success_url: `${baseUrl}/order/${orderId}?paid=1`,
    cancel_url: `${baseUrl}/checkout?cancelled=1`
  });

  await admin.from("orders").update({ stripe_session_id: checkout.id }).eq("id", orderId);

  return NextResponse.json({ url: checkout.url, orderId });
}
