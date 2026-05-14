import { NextResponse } from "next/server";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyOrderStatus } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "courier") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,customer_id,courier_id")
    .eq("id", params.id)
    .single();
  if (!order || order.courier_id !== session.userId) {
    return NextResponse.json({ error: "not assigned" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "photo required" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "photo too large (max 10MB)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "must be an image" }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_DELIVERY_PHOTO_BUCKET ?? "delivery-photos";
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${order.id}/${Date.now()}.${ext || "jpg"}`;
  const arrayBuf = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from(bucket)
    .upload(path, Buffer.from(arrayBuf), { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await admin.from("delivery_photos").insert({
    order_id: order.id,
    courier_id: session.userId,
    storage_path: path
  });

  await admin.from("orders").update({ status: "delivered" }).eq("id", order.id);

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
      status: "delivered"
    });
  }

  return NextResponse.json({ ok: true });
}
