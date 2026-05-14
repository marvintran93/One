import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatMoney, formatMiles } from "@/lib/format";
import { OrderControls } from "./OrderControls";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const admin = createSupabaseAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: customer }, { data: couriers }, { data: photo }] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", order.id),
    admin.from("profiles").select("first_name,last_name,phone,email").eq("id", order.customer_id).single(),
    admin.from("profiles").select("id,first_name,last_name").eq("role", "courier"),
    admin.from("delivery_photos").select("id,storage_path,created_at").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  let photoUrl: string | null = null;
  if (photo) {
    const bucket = process.env.SUPABASE_DELIVERY_PHOTO_BUCKET ?? "delivery-photos";
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(photo.storage_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Order #{order.id.slice(0, 8)}</h1>

      <section className="card p-4 text-sm grid grid-cols-2 gap-3">
        <div><span className="text-ink-500">Customer</span><div className="font-medium">{customer?.first_name} {customer?.last_name}</div><div className="text-ink-600">{customer?.phone} · {customer?.email}</div></div>
        <div><span className="text-ink-500">Fulfillment</span><div className="capitalize">{order.fulfillment}</div></div>
        {order.fulfillment === "delivery" && (
          <>
            <div className="col-span-2"><span className="text-ink-500">Address</span><div>{[order.address_line1, order.address_line2, order.city, order.state, order.postal_code].filter(Boolean).join(", ")}</div></div>
            <div><span className="text-ink-500">Window</span><div>{order.delivery_window ?? "—"}</div></div>
            <div><span className="text-ink-500">Distance</span><div>{formatMiles(order.delivery_distance_miles)}</div></div>
          </>
        )}
        {order.customer_note && <div className="col-span-2"><span className="text-ink-500">Note</span><div>{order.customer_note}</div></div>}
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
          <div className="text-xs text-ink-500 pt-1 capitalize">Payment: {order.payment_status}</div>
        </div>
      </section>

      <OrderControls
        orderId={order.id}
        status={order.status}
        courierId={order.courier_id}
        couriers={(couriers ?? []).map((c) => ({ id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id.slice(0, 8) }))}
      />

      {photoUrl && (
        <section className="card p-4">
          <h2 className="font-medium mb-2">Delivery photo</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Delivery confirmation" className="max-w-md rounded-md border border-ink-200" />
        </section>
      )}
    </div>
  );
}
