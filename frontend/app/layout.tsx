import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "FragrancedByMeena | Perfumes & Diffusers in Accra",
    template: "%s | FragrancedByMeena",
  },
  description:
    "Discover perfumes, Arabian fragrances, diffusers, body mists and gift sets at FragrancedByMeena, Oyarifa School Junction, Accra.",
  openGraph: {
    title: "FragrancedByMeena",
    description:
      "Your signature scent starts here. Explore our fragrance collection in Accra.",
    type: "website",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
