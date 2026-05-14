"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(action: "approve" | "deny") {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/users/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Failed");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      {status !== "approved" && (
        <button onClick={() => act("approve")} className="btn-primary" disabled={busy !== null}>
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
      )}
      {status !== "denied" && (
        <button onClick={() => act("deny")} className="btn-secondary" disabled={busy !== null}>
          {busy === "deny" ? "Denying…" : "Deny"}
        </button>
      )}
    </div>
  );
}
