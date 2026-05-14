import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pending",
  "/auth/callback"
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/webhook/")) return true; // Stripe webhook
  return false;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const pathname = req.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not signed in: allow public paths, otherwise redirect to /login.
  if (!user) {
    if (isPublicPath(pathname) || pathname === "/") return res;
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in: fetch role/status for routing decisions.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "customer";
  const status = profile?.status ?? "pending";

  // Already signed in: keep them out of /login and /signup.
  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : role === "courier" ? "/courier" : status === "approved" ? "/store" : "/pending";
    return NextResponse.redirect(url);
  }

  // Role gating for admin/courier sections.
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = role === "courier" ? "/courier" : status === "approved" ? "/store" : "/pending";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/courier") && role !== "courier") {
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : status === "approved" ? "/store" : "/pending";
    return NextResponse.redirect(url);
  }

  // Customer-area pages require approval.
  const customerProtected = ["/store", "/cart", "/checkout", "/account", "/order"];
  if (role === "customer" && customerProtected.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (status !== "approved") {
      const url = req.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
