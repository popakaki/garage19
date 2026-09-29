import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CallbackFab } from "@/components/forms/callback-fab";
import { buildMetadata, organizationJsonLd } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/" });
}

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = await organizationJsonLd();

  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col bg-ink-50 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CallbackFab />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
