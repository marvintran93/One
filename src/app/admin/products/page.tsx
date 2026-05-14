import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchActiveProducts } from "@/lib/products";
import { ProductsManager } from "./ProductsManager";
import type { Product, ProductSize } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const admin = createSupabaseAdminClient();
  // Show inactive too for admin
  const { data: rows } = await admin
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const ids = (rows ?? []).map((p) => p.id);
  const { data: sizes } = ids.length
    ? await admin.from("product_sizes").select("*").in("product_id", ids)
    : { data: [] as ProductSize[] };

  const order: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 };
  const products: Product[] = (rows ?? []).map((p) => ({
    ...(p as Omit<Product, "sizes">),
    sizes: (sizes ?? [])
      .filter((s) => s.product_id === p.id)
      .sort((a, b) => order[a.size] - order[b.size])
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Products</h1>
      <ProductsManager initial={products} />
    </div>
  );
}
