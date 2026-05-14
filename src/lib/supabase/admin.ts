import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Bypasses RLS.
// NEVER expose this in the browser bundle.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin client not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
