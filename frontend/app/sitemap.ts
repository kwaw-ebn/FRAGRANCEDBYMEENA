import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let products: any[] = [];
  try {
    const r = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") +
        "/api/products?limit=100",
      { cache: "no-store" },
    );
    if (r.ok) products = (await r.json()).items;
  } catch {}
  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    ...products.map((p) => ({
      url: site + "/products/" + p.slug,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
