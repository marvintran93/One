/**
 * Distance lookup via Google Distance Matrix.
 * Returns driving distance in miles between the configured store origin
 * and the customer's destination address.
 */
export interface DistanceResult {
  miles: number;
  durationSeconds: number;
}

export async function fetchDrivingDistanceMiles(destination: string): Promise<DistanceResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const origin = process.env.STORE_ORIGIN_ADDRESS;
  if (!key || !origin) {
    throw new Error("Distance lookup not configured (GOOGLE_MAPS_API_KEY / STORE_ORIGIN_ADDRESS).");
  }
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origin);
  url.searchParams.set("destinations", destination);
  url.searchParams.set("units", "imperial");
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Distance Matrix HTTP ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    rows?: Array<{
      elements: Array<{
        status: string;
        distance?: { value: number };
        duration?: { value: number };
      }>;
    }>;
    error_message?: string;
  };
  if (data.status !== "OK") {
    throw new Error(`Distance Matrix error: ${data.status} ${data.error_message ?? ""}`.trim());
  }
  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== "OK" || !el.distance || !el.duration) {
    throw new Error(`Distance Matrix element error: ${el?.status ?? "missing"}`);
  }
  return {
    // distance.value is in meters; 1609.344 m per mile
    miles: el.distance.value / 1609.344,
    durationSeconds: el.duration.value
  };
}
