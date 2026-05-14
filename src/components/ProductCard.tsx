"use client";

/* eslint-disable @next/next/no-img-element */

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
    <article className="card overflow-hidden flex flex-col">
      <div className="aspect-[4/5] w-full bg-ink-100 relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="inline-block h-3 w-3 rounded-full opacity-80"
              style={{ backgroundColor: product.color_accent }}
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl text-ink-900 leading-tight">{product.name}</h3>
            <span
              className="mt-2 inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: product.color_accent }}
              aria-hidden
            />
          </div>
          {product.description && (
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">{product.description}</p>
          )}
        </div>

        <div>
          <div className="eyebrow mb-2">Size</div>
          <div className="flex flex-wrap gap-2">
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
                    "px-3 py-1.5 text-xs tracking-widest uppercase rounded-sm border transition " +
                    (active
                      ? "bg-ink-900 text-ink-50 border-ink-900"
                      : disabled
                      ? "bg-transparent text-ink-300 border-ink-200 cursor-not-allowed line-through"
                      : "bg-transparent text-ink-700 border-ink-300 hover:border-ink-900 hover:text-ink-900")
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Price</div>
            <div className="font-serif text-2xl text-ink-900 tabular-nums leading-none">{priceLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="input w-14 text-center"
              aria-label="Quantity"
            />
            <button onClick={onAdd} className="btn-primary" disabled={!sel || !sel.available}>
              Add
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
