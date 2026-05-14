import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActiveProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const supabase = createSupabaseServerClient();
  const products = await fetchActiveProducts(supabase);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="mt-1 text-sm text-ink-600">
          Plain packaging. Discreet billing. $100 minimum for delivery; no minimum for local pickup.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="card p-6 text-sm text-ink-600">No items currently available. Check back soon.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
