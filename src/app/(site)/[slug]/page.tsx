import { notFound } from "next/navigation";
import { ButtonLink, Container, PageHero, Prose } from "@/components/ui";
import { VinRequestForm } from "@/components/forms/callback";
import { getFooterPages, getPageBySlug } from "@/lib/queries";
import { breadcrumbsJsonLd, buildMetadata } from "@/lib/seo";

/**
 * Контентные страницы из админки: доставка, оплата, гарантия, возврат,
 * установка, подбор по VIN, о компании, контакты, оферта.
 * Страницы создаются и редактируются в /admin/pages.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) {
    return buildMetadata({ title: "Страница не найдена", path: `/${slug}`, noIndex: true });
  }
  return buildMetadata({
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.excerpt,
    path: `/${page.slug}`,
  });
}

export default async function ContentPage({ params }: Params) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const otherPages = await getFooterPages();
  const blocks = (page.content || "").split(/<!--\s*more\s*-->/i);

  return (
    <>
      <PageHero
        title={page.title}
        description={page.excerpt}
        breadcrumbs={[{ name: page.title }]}
      />

      <Container className="py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="g19-card p-6 lg:p-8">
            <Prose html={page.content} />
          </article>

          <aside className="space-y-6">
            {slug === "podbor-po-vin" || slug === "ustanovka" ? (
              <VinRequestForm />
            ) : (
              <div className="g19-card p-6">
                <h2 className="text-base font-bold text-ink-900">Нужна помощь?</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Позвоните или оставьте заявку — подберём товар под ваш автомобиль и подскажем по доставке.
                </p>
                <ButtonLink href="/kontakty" variant="outline" size="sm" className="mt-4">
                  Контакты и реквизиты
                </ButtonLink>
              </div>
            )}

            <nav className="g19-card p-6">
              <h2 className="text-base font-bold text-ink-900">Полезные разделы</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {otherPages
                  .filter((item) => item.slug !== page.slug)
                  .map((item) => (
                    <li key={item.slug}>
                      <a href={`/${item.slug}`} className="text-ink-600 hover:text-brand-700">
                        {item.title}
                      </a>
                    </li>
                  ))}
                <li>
                  <a href="/podbor" className="font-semibold text-brand-700 hover:text-brand-800">
                    Подбор по автомобилю
                  </a>
                </li>
              </ul>
            </nav>
          </aside>
        </div>

        {blocks.length > 1 && (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {blocks.slice(1).map((block, index) => (
              <div key={index} className="g19-card p-5">
                <Prose html={block} />
              </div>
            ))}
          </div>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbsJsonLd([{ name: page.title, href: `/${page.slug}` }])),
        }}
      />
    </>
  );
}
