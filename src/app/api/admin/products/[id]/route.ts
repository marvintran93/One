import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SizeSchema = z.object({
  size: z.enum(["S", "M", "L", "XL"]),
  price_cents: z.number().int().min(0),
  available: z.boolean()
});

const PatchBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  active: z.boolean(),
  sort_order: z.number().int(),
  sizes: z.array(SizeSchema).length(4)
});

async function requireAdmin() {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color_accent: parsed.data.color_accent,
      active: parsed.data.active,
      sort_order: parsed.data.sort_order
    })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("product_sizes").delete().eq("product_id", params.id);
  const { error: szErr } = await admin
    .from("product_sizes")
    .insert(parsed.data.sizes.map((s) => ({ ...s, product_id: params.id })));
  if (szErr) return NextResponse.json({ error: szErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createSupabaseAdminClient();
  // Soft-deactivate rather than hard-delete to preserve order_items FK.
  const { error } = await admin.from("products").update({ active: false }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
