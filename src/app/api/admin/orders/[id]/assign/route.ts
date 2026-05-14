import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({ courier_id: z.string().uuid().nullable() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid courier" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (parsed.data.courier_id) {
    const { data: c } = await admin.from("profiles").select("role").eq("id", parsed.data.courier_id).single();
    if (!c || c.role !== "courier") {
      return NextResponse.json({ error: "not a courier" }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("orders")
    .update({ courier_id: parsed.data.courier_id })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
