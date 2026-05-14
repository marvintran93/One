import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney, formatMiles } from "@/lib/format";
import { ClearCartOnLoad } from "@/components/ClearCartOnLoad";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};
const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded"
};

export default async function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { paid?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) notFound();
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const justPaid = searchParams.paid === "1";

  return (
    <div className="space-y-4">
      {justPaid && <ClearCartOnLoad />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {order.id.slice(0, 8)}</h1>
        <Link href="/store" className="text-sm text-ink-600 hover:text-ink-900 underline">Back to catalog</Link>
      </div>

      {justPaid && (
        <div className="card p-4 border-emerald-300 bg-emerald-50 text-emerald-900 text-sm">
          Thanks — your order is confirmed. You&apos;ll get a notification when status changes.
        </div>
      )}

      <section className="card p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-ink-500">Status</span><div className="font-medium">{STATUS_LABEL[order.status] ?? order.status}</div></div>
          <div><span className="text-ink-500">Payment</span><div className="font-medium">{PAYMENT_LABEL[order.payment_status] ?? order.payment_status}</div></div>
          <div><span className="text-ink-500">Fulfillment</span><div className="font-medium capitalize">{order.fulfillment}</div></div>
          {order.fulfillment === "delivery" && (
            <>
              <div><span className="text-ink-500">Window</span><div className="font-medium">{order.delivery_window ?? "—"}</div></div>
              <div className="col-span-2"><span className="text-ink-500">Address</span><div className="font-medium">
                {[order.address_line1, order.address_line2, order.city, order.state, order.postal_code].filter(Boolean).join(", ")}
              </div></div>
              <div><span className="text-ink-500">Distance</span><div className="font-medium">{formatMiles(order.delivery_distance_miles)}</div></div>
            </>
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-2">Items</h2>
        <ul className="text-sm space-y-1">
          {(items ?? []).map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.product_name_snapshot} · {i.size} × {i.quantity}</span>
              <span className="tabular-nums">{formatMoney(i.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-ink-200 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatMoney(order.subtotal_cents)}</span></div>
          <div className="flex justify-between"><span>{order.fulfillment === "delivery" ? "Delivery" : "Pickup"}</span><span className="tabular-nums">{formatMoney(order.delivery_fee_cents)}</span></div>
          <div className="flex justify-between text-base font-semibold pt-1"><span>Total</span><span className="tabular-nums">{formatMoney(order.total_cents)}</span></div>
        </div>
      </section>
    </div>
  );
}
