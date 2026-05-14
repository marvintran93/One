import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Brand />
          <p className="mt-2 text-xs text-ink-500 uppercase tracking-widest">Members only</p>
        </div>
        <Suspense fallback={<div className="card p-6 text-sm text-ink-500">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
