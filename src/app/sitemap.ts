import type { MetadataRoute } from "next";
import { getCarLandingTree, getCategoryTreeFlat, getProductSlugsForSitemap } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const MAX_PRODUCTS = 5000;

/**
 * Карта сайта: статические страницы, категории, товары и SEO-посадочные
 * «авто → товары» (/podbor/...). База может быть недоступна — в этом случае
 * отдаём только статический список, чтобы /sitemap.xml не падал.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/catalog"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/podbor"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/brands"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/cart"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/compare"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/wishlist"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const [categories, products, landings] = await Promise.all([
      getCategoryTreeFlat(),
      getProductSlugsForSitemap(),
      getCarLandingTree(),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = categories
      .filter((category) => category.productCount > 0)
      .map((category) => ({
        url: absoluteUrl(category.path),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      }));

    const productEntries: MetadataRoute.Sitemap = products.slice(0, MAX_PRODUCTS).map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
      images: product.images
        .map((image) => image.url)
        .filter((url) => Boolean(url))
        .map((url) => absoluteUrl(url)),
    }));

    const landingEntries: MetadataRoute.Sitemap = [];
    for (const brand of landings) {
      landingEntries.push({
        url: absoluteUrl(`/podbor/${brand.slug}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
      for (const model of brand.models) {
        landingEntries.push({
          url: absoluteUrl(`/podbor/${brand.slug}/${model.slug}`),
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
        for (const generation of model.generations) {
          landingEntries.push({
            url: absoluteUrl(`/podbor/${brand.slug}/${model.slug}/${generation.slug}`),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.5,
          });
        }
      }
    }

    return [...staticEntries, ...categoryEntries, ...productEntries, ...landingEntries];
  } catch {
    return staticEntries;
  }
}
