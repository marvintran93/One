import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({ role: z.enum(["customer", "courier"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (params.id === session.userId) {
    return NextResponse.json({ error: "cannot change your own role" }, { status: 400 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid role" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ role: parsed.data.role }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
