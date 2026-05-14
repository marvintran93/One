import Link from "next/link";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export default async function AccountPage() {
  const session = await getSessionAndProfile();
  if (!session) return null; // middleware will redirect
  const supabase = createSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,created_at,total_cents,status,fulfillment,payment_status")
    .eq("customer_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="card p-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-ink-500">Name</span><div>{session.profile.first_name} {session.profile.last_name}</div></div>
          <div><span className="text-ink-500">Email</span><div>{session.profile.email}</div></div>
          <div><span className="text-ink-500">Phone</span><div>{session.profile.phone ?? "—"}</div></div>
          {session.profile.referral_code && (
            <div>
              <span className="text-ink-500">Your invite code</span>
              <div className="font-mono">{session.profile.referral_code}</div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Orders</h2>
        {!orders || orders.length === 0 ? (
          <div className="card p-4 text-sm text-ink-600">No orders yet.</div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.id}`} className="card p-4 flex items-center justify-between hover:bg-ink-50">
                  <div className="text-sm">
                    <div className="font-medium">#{o.id.slice(0, 8)}</div>
                    <div className="text-ink-500">{new Date(o.created_at).toLocaleString()} · {o.fulfillment}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="tabular-nums">{formatMoney(o.total_cents)}</div>
                    <div className="text-ink-500">{STATUS_LABEL[o.status] ?? o.status}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
