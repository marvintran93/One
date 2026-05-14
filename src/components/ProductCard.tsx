"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import type { Product, GarmentSize } from "@/lib/types";
import { SIZES } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const available = useMemo(() => {
    const m = new Map<GarmentSize, { price_cents: number; available: boolean }>();
    for (const s of product.sizes) m.set(s.size, { price_cents: s.price_cents, available: s.available });
    return m;
  }, [product.sizes]);

  const firstAvailable: GarmentSize | null =
    SIZES.find((s) => available.get(s)?.available) ?? null;
  const [size, setSize] = useState<GarmentSize | null>(firstAvailable);
  const [qty, setQty] = useState(1);

  const sel = size ? available.get(size) : undefined;
  const priceLabel = sel ? formatMoney(sel.price_cents) : "—";

  function onAdd() {
    if (!size || !sel || !sel.available) return;
    add({
      product_id: product.id,
      product_name: product.name,
      color_accent: product.color_accent,
      size,
      unit_price_cents: sel.price_cents,
      quantity: qty
    });
    setQty(1);
  }

  return (
    <div className="card p-4 flex gap-4">
      <div
        className="hidden sm:block w-20 h-20 shrink-0 rounded-md border border-ink-200 bg-ink-100"
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: product.color_accent }}
            aria-hidden
          />
          <h3 className="font-medium truncate">{product.name}</h3>
        </div>
        {product.description && (
          <p className="mt-1 text-sm text-ink-600 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {SIZES.map((s) => {
            const a = available.get(s);
            const disabled = !a || !a.available;
            const active = size === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => !disabled && setSize(s)}
                disabled={disabled}
                className={
                  "px-3 py-1 text-sm rounded-md border transition " +
                  (active
                    ? "bg-ink-900 text-white border-ink-900"
                    : disabled
                    ? "bg-ink-100 text-ink-400 border-ink-200 cursor-not-allowed"
                    : "bg-white text-ink-900 border-ink-200 hover:bg-ink-100")
                }
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold tabular-nums">{priceLabel}</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="input w-16 text-center"
              aria-label="Quantity"
            />
            <button onClick={onAdd} className="btn-primary" disabled={!sel || !sel.available}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
