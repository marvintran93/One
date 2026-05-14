import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="text-base font-semibold tracking-tight">Admin</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin/approvals" className="text-ink-700 hover:text-ink-900">Approvals</Link>
            <Link href="/admin/orders" className="text-ink-700 hover:text-ink-900">Orders</Link>
            <Link href="/admin/products" className="text-ink-700 hover:text-ink-900">Products</Link>
            <Link href="/admin/couriers" className="text-ink-700 hover:text-ink-900">Couriers</Link>
            <SignOutButton className="text-sm text-ink-500 hover:text-ink-900" />
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
