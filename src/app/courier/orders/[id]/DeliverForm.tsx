"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeliverForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) { setError("Photo required."); return; }
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`/api/courier/orders/${orderId}/deliver`, {
        method: "POST",
        body: form
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      router.replace("/courier");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-medium">Mark delivered</h2>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={!file || busy} onClick={submit}>
        {busy ? "Uploading…" : "Confirm delivery"}
      </button>
    </section>
  );
}
