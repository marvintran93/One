import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyAdminNewOrder, notifyOrderConfirmation } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature or secret" }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook:verify]", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = (s.metadata?.order_id ?? "") as string;
        if (!orderId) break;
        const paymentIntentId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
        await admin
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent: paymentIntentId
          })
          .eq("id", orderId);

        // Fetch order + customer for notifications
        const { data: order } = await admin
          .from("orders")
          .select("id,total_cents,fulfillment,customer_id")
          .eq("id", orderId)
          .single();
        if (order) {
          const { data: profile } = await admin
            .from("profiles")
            .select("email,phone,first_name")
            .eq("id", order.customer_id)
            .single();
          if (profile) {
            await notifyOrderConfirmation({
              email: profile.email,
              phone: profile.phone,
              firstName: profile.first_name,
              orderId: order.id,
              totalCents: order.total_cents
            });
          }
          await notifyAdminNewOrder({
            orderId: order.id,
            totalCents: order.total_cents,
            fulfillment: order.fulfillment
          });
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = (s.metadata?.order_id ?? "") as string;
        if (!orderId) break;
        await admin.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
        break;
      }
      case "charge.refunded": {
        const c = event.data.object as Stripe.Charge;
        const piId = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
        if (!piId) break;
        await admin.from("orders").update({ payment_status: "refunded" }).eq("stripe_payment_intent", piId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook:handler]", err);
    return NextResponse.json({ received: true, handled: false }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
