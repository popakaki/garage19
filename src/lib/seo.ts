import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

type SeoInput = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  path?: string;
  images?: string[];
  noIndex?: boolean;
  type?: "website" | "article" | "product";
};

/**
 * Единый генератор метаданных для страниц.
 * Если title не задан — берётся значение по умолчанию из настроек сайта.
 */
export async function buildMetadata(input: SeoInput = {}): Promise<Metadata> {
  const settings = await getSettings();
  const defaultTitle = settings["seo.defaultTitle"] || "Garage19";
  const defaultDescription = settings["seo.defaultDescription"] || "";
  const title = input.title?.trim() || defaultTitle;
  const description = input.description?.trim() || defaultDescription;
  const url = absoluteUrl(input.path ?? "/");
  const images = (input.images?.filter(Boolean) as string[]) || [];

  return {
    title,
    description,
    keywords: input.keywords ?? settings["seo.defaultKeywords"],
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: settings["general.siteName"] || "Garage19",
      locale: "ru_RU",
      type: input.type === "article" ? "article" : "website",
      images: images.length ? images.map((image) => ({ url: image })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length ? images : undefined,
    },
  };
}

/** JSON-LD организации для главной страницы. */
export async function organizationJsonLd() {
  const settings = await getSettings();
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: settings["general.siteName"] || "Garage19",
    description: settings["seo.defaultDescription"],
    url: siteUrl(),
    telephone: settings["contacts.phone"],
    email: settings["contacts.email"],
    address: {
      "@type": "PostalAddress",
      streetAddress: settings["contacts.address"],
      addressCountry: "RU",
    },
    openingHours: settings["contacts.workTime"],
  };
}

/** JSON-LD товара с предложением и рейтингом. */
export function productJsonLd(input: {
  name: string;
  description?: string | null;
  images: string[];
  sku?: string | null;
  brand?: string | null;
  price: number; // копейки
  inStock: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  reviews?: { author: string; rating: number; text: string; date: Date }[];
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ?? undefined,
    image: input.images.map((image) => (image.startsWith("http") ? image : absoluteUrl(image))),
    sku: input.sku ?? undefined,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(input.url),
      priceCurrency: "RUB",
      price: (input.price / 100).toFixed(2),
      availability: input.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Garage19" },
    },
    ...(input.ratingCount && input.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.ratingAvg?.toFixed(1) ?? "5",
            reviewCount: input.ratingCount,
          },
        }
      : {}),
    ...(input.reviews?.length
      ? {
          review: input.reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.author },
            datePublished: review.date.toISOString().slice(0, 10),
            reviewBody: review.text,
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
          })),
        }
      : {}),
  };
}

/** JSON-LD хлебных крошек. */
export function breadcrumbsJsonLd(items: { name: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href ? absoluteUrl(item.href) : undefined,
    })),
  };
}

/** JSON-LD для страницы категории/листинга. */
export function itemListJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}
