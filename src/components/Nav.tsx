"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Brand } from "./Brand";
import { SignOutButton } from "./SignOutButton";

export function Nav() {
  const count = useCart((s) => s.count());
  return (
    <header className="sticky top-0 z-10 border-b border-ink-200 bg-ink-50/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
        <Link href="/store" aria-label="Home" className="flex items-center">
          <Brand size="sm" />
        </Link>
        <nav className="flex items-center gap-5 text-[11px] uppercase tracking-widest text-ink-700">
          <Link href="/store" className="hover:text-ink-900">Shop</Link>
          <Link href="/account" className="hover:text-ink-900">Account</Link>
          <Link href="/cart" className="relative inline-flex items-center gap-1.5 hover:text-ink-900">
            Cart
            {count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink-900 px-1.5 text-[10px] font-medium text-ink-50 tracking-normal">
                {count}
              </span>
            )}
          </Link>
          <SignOutButton className="text-[11px] uppercase tracking-widest text-ink-500 hover:text-ink-900" />
        </nav>
      </div>
    </header>
  );
}
