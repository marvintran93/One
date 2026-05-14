import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ApprovalActions } from "./ApprovalActions";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const admin = createSupabaseAdminClient();
  const { data: pending } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,phone,created_at,invite_code_used,status")
    .in("status", ["pending", "denied"])
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Approvals</h1>
      {!pending || pending.length === 0 ? (
        <div className="card p-4 text-sm text-ink-600">No accounts waiting.</div>
      ) : (
        <ul className="space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{p.first_name} {p.last_name}</div>
                <div className="text-ink-600">{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                <div className="text-xs text-ink-500 mt-1">
                  Registered {new Date(p.created_at).toLocaleString()}
                  {p.invite_code_used && <> · invite {p.invite_code_used}</>}
                  <> · status {p.status}</>
                </div>
              </div>
              <ApprovalActions id={p.id} status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
