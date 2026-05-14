import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAndProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Brand } from "@/components/Brand";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const session = await getSessionAndProfile();
  if (!session) redirect("/login");
  const { profile } = session;
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "courier") redirect("/courier");
  if (profile.status === "approved") redirect("/store");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-md card p-10 text-center">
        <div className="flex justify-center"><Brand size="md" /></div>
        <h1 className="mt-6 font-serif text-2xl text-ink-900">
          {profile.status === "denied" ? "Account not approved" : "Pending approval"}
        </h1>
        <p className="mt-3 text-sm text-ink-600 leading-relaxed">
          {profile.status === "denied"
            ? "Your account was not approved. Please reach out to the admin if you think this is a mistake."
            : "Your account is being reviewed. You'll get an email when it's active. You can close this tab."}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <SignOutButton />
          <Link href="/login" className="text-[11px] uppercase tracking-widest text-ink-500 hover:text-ink-900">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
