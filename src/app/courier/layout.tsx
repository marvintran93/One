import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  await requireRole("courier");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/courier" className="text-base font-semibold tracking-tight">Courier</Link>
          <SignOutButton className="text-sm text-ink-500 hover:text-ink-900" />
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
