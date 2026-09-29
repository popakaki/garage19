import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Корневой layout: только каркас документа.
 * Публичная обвязка (шапка, подвал, плавающая кнопка) живёт в `(site)/layout.tsx`,
 * админка — в собственном `admin/(panel)/layout.tsx`, поэтому админ-страницы
 * не наследуют витрину сайта.
 */
export const metadata: Metadata = {
  title: {
    default: "Garage19 — багажники, автокрепления и фаркопы",
    template: "%s | Garage19",
  },
  description:
    "Багажники на крышу, автобоксы, велокрепления, лыжные крепления и фаркопы с подбором по марке, модели и поколению автомобиля.",
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col bg-ink-50 antialiased">{children}</body>
    </html>
  );
}
