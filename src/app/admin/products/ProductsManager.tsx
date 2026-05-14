"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, GarmentSize } from "@/lib/types";
import { SIZES } from "@/lib/types";

interface SizeEdit {
  price_cents: number;
  available: boolean;
}

interface ProductEdit {
  id: string | null;
  name: string;
  description: string;
  color_accent: string;
  active: boolean;
  sort_order: number;
  sizes: Record<GarmentSize, SizeEdit>;
}

function emptyEdit(): ProductEdit {
  return {
    id: null,
    name: "",
    description: "",
    color_accent: "#888881",
    active: true,
    sort_order: 0,
    sizes: {
      S: { price_cents: 0, available: true },
      M: { price_cents: 0, available: true },
      L: { price_cents: 0, available: true },
      XL: { price_cents: 0, available: true }
    }
  };
}

function fromProduct(p: Product): ProductEdit {
  const sizes = { S: { price_cents: 0, available: false }, M: { price_cents: 0, available: false }, L: { price_cents: 0, available: false }, XL: { price_cents: 0, available: false } } as Record<GarmentSize, SizeEdit>;
  for (const s of p.sizes) sizes[s.size] = { price_cents: s.price_cents, available: s.available };
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    color_accent: p.color_accent,
    active: p.active,
    sort_order: p.sort_order,
    sizes
  };
}

export function ProductsManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductEdit | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(editing.id ? `/api/admin/products/${editing.id}` : "/api/admin/products", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description || null,
          color_accent: editing.color_accent,
          active: editing.active,
          sort_order: editing.sort_order,
          sizes: SIZES.map((s) => ({
            size: s,
            price_cents: Math.round(editing.sizes[s].price_cents),
            available: editing.sizes[s].available
          }))
        })
      });
      if (!res.ok) {
        alert((await res.json().catch(() => ({ error: "Failed" }))).error);
      } else {
        setEditing(null);
        router.refresh();
      }
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json().catch(() => ({ error: "Failed" }))).error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing(emptyEdit())}>Add product</button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-4 text-sm text-ink-600">No products yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Sizes</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((p) => (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color_accent }} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    {p.description && <div className="text-xs text-ink-500">{p.description}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {p.sizes.map((s) => `${s.size}:$${(s.price_cents/100).toFixed(2)}${s.available?"":"*"}`).join("  ")}
                  </td>
                  <td className="px-3 py-2">{p.active ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button className="btn-secondary" onClick={() => setEditing(fromProduct(p))}>Edit</button>
                    <button className="btn-ghost text-red-600" onClick={() => remove(p.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-3 bg-white">
            <h2 className="font-medium">{editing.id ? "Edit product" : "Add product"}</h2>
            <div>
              <label className="label">Name</label>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Color accent</label>
                <input type="color" className="input h-10" value={editing.color_accent} onChange={(e) => setEditing({ ...editing, color_accent: e.target.value })} />
              </div>
              <div>
                <label className="label">Sort order</label>
                <input type="number" className="input" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Active</label>
                <select className="input" value={editing.active ? "1" : "0"} onChange={(e) => setEditing({ ...editing, active: e.target.value === "1" })}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="label">Sizes</div>
              {SIZES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-8 text-sm font-medium">{s}</div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input"
                      value={(editing.sizes[s].price_cents / 100).toFixed(2)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sizes: { ...editing.sizes, [s]: { ...editing.sizes[s], price_cents: Math.round(Number(e.target.value) * 100) } }
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={editing.sizes[s].available} onChange={(e) => setEditing({ ...editing, sizes: { ...editing.sizes, [s]: { ...editing.sizes[s], available: e.target.checked } } })} />
                    Available
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={busy || !editing.name.trim()}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
