import { NextResponse } from "next/server";
import { getSessionAndProfile } from "@/lib/auth";
import { fetchDrivingDistanceMiles } from "@/lib/distance";
import { deliveryFeeForMiles } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionAndProfile();
  if (!session || session.profile.status !== "approved") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const address = String(body?.address ?? "").trim();
  if (!address) {
    return NextResponse.json({ available: false, miles: null, feeCents: 0, reason: "Missing address." });
  }

  try {
    const { miles } = await fetchDrivingDistanceMiles(address);
    const quote = deliveryFeeForMiles(miles);
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[delivery-quote]", err);
    return NextResponse.json(
      { available: false, miles: null, feeCents: 0, reason: "Could not look up address. Check formatting and try again." },
      { status: 200 }
    );
  }
}
