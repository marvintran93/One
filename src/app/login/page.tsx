import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center flex flex-col items-center gap-3">
          <Brand size="lg" />
          <p className="eyebrow">Members only</p>
        </div>
        <Suspense fallback={<div className="card p-6 text-sm text-ink-500">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
