import { requireApprovedCustomer } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireApprovedCustomer();
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co.";
  return (
    <div className="min-h-screen flex flex-col">
      <Nav brand={brand} />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
      <footer className="border-t border-ink-200 py-6 text-center text-xs text-ink-500">
        {brand}. Members only. Discreet shipping &amp; billing.
      </footer>
    </div>
  );
}
