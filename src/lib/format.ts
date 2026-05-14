export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatMiles(miles: number | null | undefined): string {
  if (miles == null) return "—";
  return `${miles.toFixed(1)} mi`;
}
