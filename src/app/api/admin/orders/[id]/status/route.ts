import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyOrderStatus } from "@/lib/notifications";

export const runtime = "nodejs";

const Body = z.object({
  status: z.enum(["received", "packed", "out_for_delivery", "delivered", "cancelled"])
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid status" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", params.id)
    .select("id,customer_id")
    .single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? "not found" }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles")
    .select("email,phone,first_name")
    .eq("id", order.customer_id)
    .single();
  if (profile) {
    await notifyOrderStatus({
      email: profile.email,
      phone: profile.phone,
      firstName: profile.first_name,
      orderId: order.id,
      status: parsed.data.status
    });
  }

  return NextResponse.json({ ok: true });
}
