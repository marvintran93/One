import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("orders")
    .select("id,created_at,total_cents,status,payment_status,fulfillment,customer_id,customer_note,delivery_window")
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams.status === "open") {
    query = query.in("status", ["received", "packed", "out_for_delivery"]);
  } else if (searchParams.status && STATUS_LABEL[searchParams.status]) {
    query = query.eq("status", searchParams.status);
  }
  const { data: orders } = await query;
  const customerIds = Array.from(new Set((orders ?? []).map((o) => o.customer_id)));
  const { data: profiles } = customerIds.length
    ? await admin.from("profiles").select("id,first_name,last_name,phone,email").in("id", customerIds)
    : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string }> };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <nav className="flex gap-2 text-sm">
          <Link href="/admin/orders" className="btn-ghost">All</Link>
          <Link href="/admin/orders?status=open" className="btn-ghost">Open</Link>
          <Link href="/admin/orders?status=delivered" className="btn-ghost">Delivered</Link>
        </nav>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="card p-4 text-sm text-ink-600">No orders.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-left">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Fulfillment</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const p = profileMap.get(o.customer_id);
                return (
                  <tr key={o.id} className="border-t border-ink-100">
                    <td className="px-3 py-2">
                      <Link href={`/admin/orders/${o.id}`} className="underline">#{o.id.slice(0, 8)}</Link>
                      <div className="text-xs text-ink-500">{new Date(o.created_at).toLocaleString()}</div>
                    </td>
                    <td className="px-3 py-2">
                      {p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "—"}
                      <div className="text-xs text-ink-500">{p?.phone ?? p?.email ?? ""}</div>
                    </td>
                    <td className="px-3 py-2 capitalize">{o.fulfillment}{o.delivery_window ? ` · ${o.delivery_window}` : ""}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[o.status] ?? o.status}</td>
                    <td className="px-3 py-2 capitalize">{o.payment_status}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(o.total_cents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
