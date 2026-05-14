"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotalCents());

  if (lines.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Cart</h1>
        <div className="card p-6 text-sm text-ink-600">
          Your cart is empty.{" "}
          <Link href="/store" className="underline">Browse the catalog</Link>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={`${l.product_id}-${l.size}`} className="card p-4 flex items-center gap-3">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: l.color_accent }}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{l.product_name}</div>
              <div className="text-xs text-ink-500">Size {l.size} · {formatMoney(l.unit_price_cents)} each</div>
            </div>
            <input
              type="number"
              min={1}
              value={l.quantity}
              onChange={(e) => setQuantity(l.product_id, l.size, Number(e.target.value) || 1)}
              className="input w-16 text-center"
              aria-label="Quantity"
            />
            <div className="w-20 text-right tabular-nums">{formatMoney(l.unit_price_cents * l.quantity)}</div>
            <button
              onClick={() => remove(l.product_id, l.size)}
              className="text-ink-500 hover:text-ink-900 text-sm"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 card p-4 flex items-center justify-between">
        <div className="text-sm text-ink-600">Subtotal</div>
        <div className="text-lg font-semibold tabular-nums">{formatMoney(subtotal)}</div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Link href="/store" className="btn-secondary">Keep shopping</Link>
        <Link href="/checkout" className="btn-primary">Checkout</Link>
      </div>
    </div>
  );
}
