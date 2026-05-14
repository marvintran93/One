import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActiveProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const supabase = createSupabaseServerClient();
  const products = await fetchActiveProducts(supabase);

  return (
    <div>
      <header className="mb-10 text-center max-w-2xl mx-auto">
        <div className="eyebrow">The Collection</div>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl font-normal tracking-tight text-ink-900">
          Considered pieces, quietly delivered.
        </h1>
        <p className="mt-4 text-sm text-ink-600 leading-relaxed">
          Plain packaging. Discreet billing. $100 minimum for delivery; no minimum for local pickup.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-600">
          The catalog is being updated. Check back shortly.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
