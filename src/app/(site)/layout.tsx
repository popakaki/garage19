import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CallbackFab } from "@/components/forms/callback";
import { buildMetadata, organizationJsonLd } from "@/lib/seo";

/** Обвязка витрины: шапка, подвал, плавающая кнопка обратного звонка. */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/" });
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = await organizationJsonLd();

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CallbackFab />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
