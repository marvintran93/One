import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CouriersManager } from "./CouriersManager";

export const dynamic = "force-dynamic";

export default async function CouriersPage() {
  const admin = createSupabaseAdminClient();
  const { data: couriers } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,phone,role,status")
    .eq("role", "courier")
    .order("created_at", { ascending: true });
  const { data: candidates } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name")
    .eq("role", "customer")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Couriers</h1>
      <CouriersManager
        couriers={(couriers ?? []).map((c) => ({
          id: c.id,
          email: c.email,
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
          phone: c.phone
        }))}
        candidates={(candidates ?? []).map((c) => ({
          id: c.id,
          email: c.email,
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
        }))}
      />
    </div>
  );
}
