"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Person { id: string; email: string; name: string; phone?: string | null; }

export function CouriersManager({ couriers, candidates }: { couriers: Person[]; candidates: Person[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  async function setRole(id: string, role: "courier" | "customer") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (!res.ok) alert((await res.json().catch(() => ({ error: "Failed" }))).error);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h2 className="font-medium mb-2">Active couriers</h2>
        {couriers.length === 0 ? (
          <div className="text-sm text-ink-600">No couriers yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {couriers.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-t border-ink-100 pt-2 first:border-0 first:pt-0">
                <div>
                  <div className="font-medium">{c.name || c.email}</div>
                  <div className="text-ink-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
                </div>
                <button className="btn-ghost text-red-600" onClick={() => setRole(c.id, "customer")} disabled={busy}>Demote</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-2">Promote a customer to courier</h2>
        <div className="flex gap-2">
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">— Choose a customer —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.email}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => selected && setRole(selected, "courier")} disabled={!selected || busy}>
            Promote
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-500">Couriers can see only orders assigned to them. They cannot browse the storefront.</p>
      </section>
    </div>
  );
}
