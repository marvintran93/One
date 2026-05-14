import { NextResponse } from "next/server";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyApproval } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: session.userId })
    .eq("id", params.id)
    .select("email,phone,first_name")
    .single();
  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 400 });
  }
  await notifyApproval({ email: profile.email, phone: profile.phone, firstName: profile.first_name });
  return NextResponse.json({ ok: true });
}
