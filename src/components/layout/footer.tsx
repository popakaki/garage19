import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { DELIVERY_TYPES, PAYMENT_TYPES } from "@/lib/constants";
import { getCurrentCity } from "@/lib/city";
import { getCategoryTree, getFooterPages } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

/** Подвал сайта: категории, информация, контакты, способы доставки и оплаты. */
export async function Footer() {
  const [categories, pages, settings, city] = await Promise.all([
    getCategoryTree(),
    getFooterPages(),
    getSettings(),
    getCurrentCity(),
  ]);

  const phone = city.phone || settings["contacts.phone"];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink-950 text-ink-300">
      <div className="g19-container grid gap-10 py-12 lg:grid-cols-4">
        <div>
          <div className="[&_span]:text-white">
            <Logo className="[&_.text-ink-950]:text-white" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            {settings["general.tagline"]}. Подбираем багажные системы и фаркопы по марке, модели и поколению
            автомобиля, помогаем с установкой.
          </p>
          <div className="mt-5 space-y-2 text-sm">
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-white">
              <Phone className="size-4 text-brand-400" />
              {phone}
            </a>
            <a href={`mailto:${settings["contacts.email"]}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="size-4 text-brand-400" />
              {settings["contacts.email"]}
            </a>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
              {city.address ?? settings["contacts.address"]}
            </p>
            <p className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-400" />
              {city.workTime ?? settings["contacts.workTime"]}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">Каталог</h3>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 9).map((category) => (
              <li key={category.id}>
                <Link href={`/catalog/${category.slug}`} className="hover:text-white">
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/podbor" className="font-semibold text-brand-400 hover:text-brand-300">
                Подбор по автомобилю
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">Покупателям</h3>
          <ul className="space-y-2 text-sm">
            {[
              { slug: "dostavka", title: "Доставка" },
              { slug: "oplata", title: "Оплата" },
              { slug: "garantiya", title: "Гарантия" },
              { slug: "vozvrat", title: "Возврат и обмен" },
              { slug: "ustanovka", title: "Установка" },
              { slug: "podbor-po-vin", title: "Подбор по VIN" },
              { slug: "o-kompanii", title: "О компании" },
              { slug: "kontakty", title: "Контакты" },
              { slug: "oferta", title: "Договор оферты" },
            ]
              .filter((item) => !pages.length || pages.some((page) => page.slug === item.slug))
              .map((item) => (
                <li key={item.slug}>
                  <Link href={`/${item.slug}`} className="hover:text-white">
                    {item.title}
                  </Link>
                </li>
              ))}
            <li>
              <Link href="/account" className="hover:text-white">
                Личный кабинет
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">Доставка и оплата</h3>
          <ul className="space-y-2 text-sm">
            {Object.values(DELIVERY_TYPES).map((label) => (
              <li key={label} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-500">
            Оплата: {Object.values(PAYMENT_TYPES).join(", ").toLowerCase()}.
          </p>
          {settings["social.telegram"] || settings["social.whatsapp"] || settings["social.vk"] ? (
            <div className="mt-4 flex gap-2 text-sm">
              {settings["social.telegram"] && (
                <a href={settings["social.telegram"]} className="rounded-lg bg-ink-900 px-3 py-1.5 hover:text-white">
                  Telegram
                </a>
              )}
              {settings["social.whatsapp"] && (
                <a href={settings["social.whatsapp"]} className="rounded-lg bg-ink-900 px-3 py-1.5 hover:text-white">
                  WhatsApp
                </a>
              )}
              {settings["social.vk"] && (
                <a href={settings["social.vk"]} className="rounded-lg bg-ink-900 px-3 py-1.5 hover:text-white">
                  VK
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-ink-900">
        <div className="g19-container flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-ink-500">
          <p>
            © {year} {settings["general.siteName"]}. Все права защищены.
          </p>
          <p className="text-ink-600">
            Цены на сайте не являются публичной офертой. Уточняйте актуальное наличие и стоимость у менеджера.
          </p>
        </div>
      </div>
    </footer>
  );
}
