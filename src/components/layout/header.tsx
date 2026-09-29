import Link from "next/link";
import { Heart, Phone, Scale, Search, ShoppingCart, User } from "lucide-react";
import { CatalogMenu, MobileMenu } from "@/components/layout/mobile-menu";
import { CitySelect } from "@/components/layout/city-select";
import { Logo } from "@/components/layout/logo";
import { CountBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/cart";
import { getCurrentCity } from "@/lib/city";
import { getCategoryTree, getCities, getHeaderPages } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

/** Шапка сайта: город, контакты, каталог, поиск, кабинет и корзина. */
export async function Header() {
  const [categories, cities, city, user, cartCount, settings, pages] = await Promise.all([
    getCategoryTree(),
    getCities(),
    getCurrentCity(),
    getCurrentUser(),
    getCartCount(),
    getSettings(),
    getHeaderPages(),
  ]);

  const phone = city.phone || settings["contacts.phone"];
  const phoneHrefValue = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur">
      {/* Верхняя полоса */}
      <div className="hidden bg-ink-950 text-ink-200 lg:block">
        <div className="g19-container relative flex h-9 items-center justify-between gap-4 text-xs">
          <div className="relative flex items-center gap-4">
            <CitySelect cities={cities} currentName={city.name} />
            <span className="text-ink-600">|</span>
            <span className="text-ink-400">{city.workTime}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dostavka" className="hover:text-white">
              Доставка
            </Link>
            <Link href="/oplata" className="hover:text-white">
              Оплата
            </Link>
            <Link href="/garantiya" className="hover:text-white">
              Гарантия
            </Link>
            <Link href="/install" className="hover:text-white">
              Установка
            </Link>
            <Link href="/opt" className="font-semibold text-brand-400 hover:text-brand-300">
              Оптовикам
            </Link>
          </div>
        </div>
      </div>

      {/* Основная строка */}
      <div className="g19-container flex h-16 items-center gap-3 lg:h-20 lg:gap-5">
        <MobileMenu categories={categories} pages={pages} />
        <Logo />

        <div className="hidden lg:block">
          <CatalogMenu categories={categories} />
        </div>

        <form action="/search" className="relative hidden flex-1 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            name="q"
            placeholder="Поиск: багажник Toyota Camry, фаркоп Haval…"
            className="g19-input h-11 pl-10 pr-28"
            aria-label="Поиск по каталогу"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Найти
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1.5 lg:gap-3">
          <a
            href={phoneHrefValue}
            className="hidden items-center gap-2 rounded-xl px-2 py-1.5 text-right leading-tight hover:bg-ink-50 xl:flex"
          >
            <Phone className="size-4 text-brand-600" />
            <span>
              <span className="block text-sm font-bold text-ink-900">{phone}</span>
              <span className="block text-[11px] text-ink-400">звонок бесплатный</span>
            </span>
          </a>

          <Link
            href={user ? "/account" : "/account/login"}
            className="hidden items-center gap-2 rounded-xl px-2 py-1.5 leading-tight hover:bg-ink-50 sm:flex"
          >
            <User className="size-5 text-ink-500" />
            <span className="hidden text-left lg:block">
              <span className="block text-xs font-semibold text-ink-900">
                {user ? user.name.split(" ")[0] : "Войти"}
              </span>
              <span className="block text-[11px] text-ink-400">
                {user ? "Личный кабинет" : "Регистрация"}
              </span>
            </span>
          </Link>

          <Link
            href="/compare"
            className="hidden size-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 hover:text-ink-800 sm:inline-flex"
            aria-label="Сравнение товаров"
          >
            <Scale className="size-5" />
          </Link>
          <Link
            href="/wishlist"
            className="hidden size-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 hover:text-ink-800 sm:inline-flex"
            aria-label="Избранное"
          >
            <Heart className="size-5" />
          </Link>

          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 rounded-xl bg-ink-950 px-3 py-2.5 text-white hover:bg-ink-800"
            aria-label="Корзина"
          >
            <ShoppingCart className="size-5" />
            <span className="hidden text-sm font-semibold lg:inline">Корзина</span>
            {cartCount > 0 && <CountBadge count={cartCount} className="absolute -right-1.5 -top-1.5 ring-2 ring-white" />}
          </Link>
        </div>
      </div>

      {/* Нижняя строка навигации */}
      <nav className="hidden border-t border-ink-100 lg:block">
        <div className="g19-container flex h-11 items-center gap-5 overflow-x-auto text-sm no-scrollbar">
          <Link href="/podbor" className="whitespace-nowrap font-semibold text-brand-700 hover:text-brand-800">
            Подбор по автомобилю
          </Link>
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/catalog/${category.slug}`}
              className="whitespace-nowrap text-ink-600 hover:text-brand-700"
            >
              {category.name}
            </Link>
          ))}
          <Link href="/brands" className="whitespace-nowrap text-ink-600 hover:text-brand-700">
            Бренды
          </Link>
        </div>
      </nav>

      {/* Поиск для мобильных */}
      <div className="border-t border-ink-100 px-4 py-2 lg:hidden">
        <form action="/search" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            name="q"
            placeholder="Поиск товаров…"
            className="g19-input h-10 pl-10"
            aria-label="Поиск по каталогу"
          />
        </form>
      </div>
    </header>
  );
}
