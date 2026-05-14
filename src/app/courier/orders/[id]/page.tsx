import { notFound } from "next/navigation";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DeliverForm } from "./DeliverForm";

export const dynamic = "force-dynamic";

export default async function CourierOrderPage({ params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session) return null;
  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,status,fulfillment,address_line1,address_line2,city,state,postal_code,delivery_window,courier_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!order || order.courier_id !== session.userId) notFound();

  const { data: items } = await admin
    .from("order_items")
    .select("id,product_name_snapshot,size,quantity")
    .eq("order_id", order.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Order #{order.id.slice(0, 8)}</h1>

      <section className="card p-4 text-sm space-y-1">
        <div className="capitalize text-ink-500">{order.fulfillment}</div>
        <div>{[order.address_line1, order.address_line2, order.city, order.state, order.postal_code].filter(Boolean).join(", ")}</div>
        {order.delivery_window && <div className="text-ink-600">Window: {order.delivery_window}</div>}
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-2">Items</h2>
        <ul className="text-sm space-y-1">
          {(items ?? []).map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.product_name_snapshot}</span>
              <span className="text-ink-600">{i.size} × {i.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      {order.status !== "delivered" && (
        <DeliverForm orderId={order.id} />
      )}
    </div>
  );
}
