import type { Metadata, Viewport } from "next";
import "./globals.css";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co.";

export const metadata: Metadata = {
  title: brand,
  description: "Members only.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
