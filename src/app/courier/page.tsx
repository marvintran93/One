import Link from "next/link";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered"
};

export default async function CourierHome() {
  const session = await getSessionAndProfile();
  if (!session) return null;
  const admin = createSupabaseAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id,status,delivery_window,address_line1,city,state,postal_code,fulfillment")
    .eq("courier_id", session.userId)
    .neq("status", "delivered")
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Your deliveries</h1>
      {!orders || orders.length === 0 ? (
        <div className="card p-4 text-sm text-ink-600">Nothing assigned right now.</div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/courier/orders/${o.id}`} className="card p-4 block hover:bg-ink-50">
                <div className="flex justify-between items-start">
                  <div className="text-sm">
                    <div className="font-medium">#{o.id.slice(0, 8)} · {STATUS_LABEL[o.status] ?? o.status}</div>
                    <div className="text-ink-600">{[o.address_line1, o.city, o.state, o.postal_code].filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="text-xs text-ink-500">{o.delivery_window ?? ""}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
