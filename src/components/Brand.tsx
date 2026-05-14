export function Brand({ subtle = false }: { subtle?: boolean }) {
  const name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co.";
  return (
    <div className={subtle ? "text-sm tracking-wide text-ink-600" : "text-lg font-semibold tracking-tight text-ink-900"}>
      {name}
    </div>
  );
}
