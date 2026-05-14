import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/pending";
  const res = NextResponse.redirect(new URL(next, url.origin));

  if (!code) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: "", ...options }); }
      }
    }
  );
  await supabase.auth.exchangeCodeForSession(code);
  return res;
}
