import type { Product, ProductSize } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchActiveProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!products || products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const { data: sizes, error: sizesError } = await supabase
    .from("product_sizes")
    .select("*")
    .in("product_id", ids);
  if (sizesError) throw sizesError;

  const bySize = new Map<string, ProductSize[]>();
  for (const s of sizes ?? []) {
    const arr = bySize.get(s.product_id) ?? [];
    arr.push(s as ProductSize);
    bySize.set(s.product_id, arr);
  }
  const order: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 };
  return products.map((p): Product => ({
    ...(p as Omit<Product, "sizes">),
    sizes: (bySize.get(p.id) ?? []).sort((a, b) => order[a.size] - order[b.size])
  }));
}
