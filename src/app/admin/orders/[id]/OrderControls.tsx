"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/types";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "packed", label: "Packed" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

interface Props {
  orderId: string;
  status: OrderStatus;
  courierId: string | null;
  couriers: { id: string; name: string }[];
}

export function OrderControls({ orderId, status, courierId, couriers }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateStatus(next: OrderStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) alert((await res.json().catch(() => ({ error: "Failed" }))).error);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function assign(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier_id: id || null })
      });
      if (!res.ok) alert((await res.json().catch(() => ({ error: "Failed" }))).error);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <section className="card p-4 space-y-4">
      <div>
        <h2 className="font-medium mb-2">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => updateStatus(s.value)}
              disabled={busy || status === s.value}
              className={status === s.value ? "btn-primary" : "btn-secondary"}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Courier</h2>
        <select
          value={courierId ?? ""}
          onChange={(e) => assign(e.target.value)}
          className="input max-w-xs"
          disabled={busy}
        >
          <option value="">— Unassigned —</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
