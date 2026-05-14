import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import type { Profile, UserRole } from "./types";

export async function getSessionAndProfile(): Promise<{ userId: string; profile: Profile } | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { userId: user.id, profile: profile as Profile };
}

/**
 * Server-side guard for customer-facing pages. Redirects to:
 *   /login       — not signed in
 *   /pending     — signed in but not approved
 *   /admin       — signed in as admin
 *   /courier     — signed in as courier
 */
export async function requireApprovedCustomer(): Promise<{ userId: string; profile: Profile }> {
  const session = await getSessionAndProfile();
  if (!session) redirect("/login");
  const { profile } = session;
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "courier") redirect("/courier");
  if (profile.status !== "approved") redirect("/pending");
  return session;
}

export async function requireRole(role: UserRole): Promise<{ userId: string; profile: Profile }> {
  const session = await getSessionAndProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== role) {
    if (session.profile.role === "admin") redirect("/admin");
    if (session.profile.role === "courier") redirect("/courier");
    redirect("/store");
  }
  return session;
}
