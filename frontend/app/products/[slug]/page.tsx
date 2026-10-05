import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Store, { Product } from "../../store";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const dynamic = "force-dynamic";
async function getProduct(slug: string): Promise<Product | null> {
  try {
    const r = await fetch(API + "/api/products/" + encodeURIComponent(slug), {
      cache: "no-store",
    });
    if (r.status === 404) return null;
    if (!r.ok) throw Error("Catalogue unavailable");
    return r.json();
  } catch {
    return null;
  }
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Fragrance collection" };
  return {
    title: p.seo_title || p.name,
    description:
      p.meta_description ||
      p.description ||
      "Explore " + p.name + " at FragrancedByMeena in Accra.",
    alternates: { canonical: "/products/" + p.slug },
    openGraph: { title: p.name, images: p.images },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((x) => (x.startsWith("/") ? site + x : x)),
    brand: { "@type": "Brand", name: p.brand },
    ...(p.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "GHS",
            availability:
              p.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: site + "/products/" + p.slug,
          },
        }
      : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(data).replace(/</g, "\\u003c"),
        }}
      />
      <Store initialProduct={p} />
    </>
  );
}
