"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Brand } from "@/components/Brand";

function yearsBetween(dob: string): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (yearsBetween(dob) < 18) {
      setError("You must be 18 or older to register.");
      return;
    }
    if (!ageConfirmed || !agreedTerms) {
      setError("Please confirm your age and accept the terms.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/pending`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          date_of_birth: dob,
          age_confirmed: true,
          invite_code: inviteCode.trim() || null
        }
      }
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    // Fire-and-forget admin alert
    fetch("/api/admin/new-account-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName })
    }).catch(() => {});
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-md card p-10 text-center">
          <div className="flex justify-center"><Brand size="md" /></div>
          <h1 className="mt-6 font-serif text-2xl text-ink-900">Check your email</h1>
          <p className="mt-3 text-sm text-ink-600 leading-relaxed">
            We sent a confirmation link to <span className="text-ink-900">{email}</span>.
            Once confirmed, your account will be reviewed for approval.
          </p>
          <Link href="/login" className="btn-secondary mt-8 inline-flex">Back to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center gap-3">
          <Brand size="lg" />
          <p className="eyebrow">Request access</p>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="fn">First name</label>
              <input id="fn" className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ln">Last name</label>
              <input id="ln" className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="em">Email</label>
            <input id="em" type="email" autoComplete="email" required className="input"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ph">Phone</label>
            <input id="ph" type="tel" autoComplete="tel" required className="input"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" required className="input"
              value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input id="pw" type="password" autoComplete="new-password" required className="input"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-ink-500">8+ characters.</p>
          </div>
          <div>
            <label className="label" htmlFor="inv">Invite / referral code (optional)</label>
            <input id="inv" className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          </div>
          <div className="space-y-2 pt-2 text-sm text-ink-700">
            <label className="flex gap-2 items-start">
              <input type="checkbox" className="mt-0.5" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
              <span>I confirm I am 18 years of age or older.</span>
            </label>
            <label className="flex gap-2 items-start">
              <input type="checkbox" className="mt-0.5" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <span>I agree to the terms of service and privacy policy.</span>
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Submitting…" : "Submit"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-ink-600">
          Already approved?{" "}
          <Link href="/login" className="text-ink-900 underline">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
