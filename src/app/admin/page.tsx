import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = createSupabaseAdminClient();
  const [{ count: pending }, { count: openOrders }, { count: today }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("orders").select("*", { count: "exact", head: true }).in("status", ["received", "packed", "out_for_delivery"]),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
  ]);

  const Card = ({ label, value, href }: { label: string; value: number | null; href: string }) => (
    <Link href={href} className="card p-4 hover:bg-ink-50 block">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="text-3xl font-semibold tabular-nums">{value ?? 0}</div>
    </Link>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Pending approvals" value={pending ?? 0} href="/admin/approvals" />
        <Card label="Open orders" value={openOrders ?? 0} href="/admin/orders?status=open" />
        <Card label="Orders today" value={today ?? 0} href="/admin/orders" />
      </div>
    </div>
  );
}
