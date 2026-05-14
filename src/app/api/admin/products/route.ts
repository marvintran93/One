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

const Body = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color must be #RRGGBB"),
  active: z.boolean(),
  sort_order: z.number().int(),
  sizes: z.array(SizeSchema).length(4)
});

export async function POST(req: Request) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: product, error } = await admin
    .from("products")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color_accent: parsed.data.color_accent,
      active: parsed.data.active,
      sort_order: parsed.data.sort_order
    })
    .select("id")
    .single();
  if (error || !product) return NextResponse.json({ error: error?.message ?? "create failed" }, { status: 500 });

  const { error: szErr } = await admin
    .from("product_sizes")
    .insert(parsed.data.sizes.map((s) => ({ ...s, product_id: product.id })));
  if (szErr) return NextResponse.json({ error: szErr.message }, { status: 500 });

  return NextResponse.json({ id: product.id });
}
