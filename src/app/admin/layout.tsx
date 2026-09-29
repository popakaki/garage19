import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Layout раздела /admin.
 * Админка использует корневой layout проекта, но не показывает публичную
 * шапку/подвал: панель помечает своё содержимое атрибутом data-admin-shell,
 * а правило в globals.css скрывает по нему site-chrome.
 * Подробности — в комментарии рядом с правилом.
 */

export const metadata: Metadata = {
  title: {
    default: "Админ-панель — Garage19",
    template: "%s — Админка Garage19",
  },
  description: "Управление заказами, каталогом, контентом и настройками магазина Garage19.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#1e2430",
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
