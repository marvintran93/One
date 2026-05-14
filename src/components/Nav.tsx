"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { SignOutButton } from "./SignOutButton";

export function Nav({ brand }: { brand: string }) {
  const count = useCart((s) => s.count());
  return (
    <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link href="/store" className="text-base font-semibold tracking-tight">{brand}</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/store" className="text-ink-700 hover:text-ink-900">Store</Link>
          <Link href="/account" className="text-ink-700 hover:text-ink-900">Account</Link>
          <Link href="/cart" className="relative inline-flex items-center gap-1 text-ink-700 hover:text-ink-900">
            Cart
            {count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink-900 px-1 text-[11px] font-medium text-white">
                {count}
              </span>
            )}
          </Link>
          <SignOutButton className="text-sm text-ink-500 hover:text-ink-900" />
        </nav>
      </div>
    </header>
  );
}
