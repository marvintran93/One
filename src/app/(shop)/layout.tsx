import { requireApprovedCustomer } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireApprovedCustomer();
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co.";
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-10">{children}</main>
      <footer className="border-t border-ink-200 py-10 text-center">
        <div className="text-[10px] uppercase tracking-widest text-ink-500">
          {brand} · Members only · Discreet packaging &amp; billing
        </div>
      </footer>
    </div>
  );
}
