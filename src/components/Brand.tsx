/* eslint-disable @next/next/no-img-element */

export function Brand({ subtle = false, size = "md" }: { subtle?: boolean; size?: "sm" | "md" | "lg" }) {
  const name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co.";
  const logo = process.env.NEXT_PUBLIC_LOGO_URL;

  const heights = { sm: "h-6", md: "h-8", lg: "h-12" } as const;
  const textSizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" } as const;

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={`${heights[size]} w-auto object-contain ${subtle ? "opacity-80" : ""}`}
      />
    );
  }

  return (
    <div className={`font-serif ${textSizes[size]} tracking-tight ${subtle ? "text-ink-600" : "text-ink-900"}`}>
      {name}
    </div>
  );
}
