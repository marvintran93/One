import { NextResponse } from "next/server";
import { notifyAdminNewAccount, notifySignupConfirmation } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    if (!email) return NextResponse.json({ ok: false }, { status: 400 });
    const firstName = body.firstName ?? null;
    const lastName = body.lastName ?? null;
    await Promise.all([
      notifyAdminNewAccount({ email, firstName, lastName }),
      notifySignupConfirmation({ email, firstName })
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
