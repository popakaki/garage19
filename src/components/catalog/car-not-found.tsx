import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { requestCarSelectionFormAction } from "@/lib/actions/catalog";

/**
 * Сценарий «нет моей модификации / ничего не нашлось» — самая частая точка
 * отвала в конфигураторах конкурентов. Здесь: сброс фильтров, показ
 * универсальных товаров и заявка менеджеру (в т.ч. по VIN).
 */
export function CarNotFoundRequest({
  basePath,
  carLabel,
  source = "catalog_empty",
  className,
}: {
  basePath: string;
  carLabel?: string;
  source?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-6">
        <div>
          <h3 className="text-lg font-bold text-ink-900">Не нашли подходящий товар?</h3>
          <p className="mt-2 text-sm text-ink-600">
            {carLabel
              ? `Для «${carLabel}» в базе пока нет точного совпадения.`
              : "Под текущие фильтры ничего не подошло."}{" "}
            Это не значит, что товара не существует: каталоги производителей шире нашего сайта.
            Оставьте заявку — менеджер проверит совместимость по заводским таблицам и подберёт комплект.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
            <li>• Проверим совместимость по VIN или номеру кузова</li>
            <li>• Предложим универсальные варианты, если модельных нет</li>
            <li>• Ответим в течение рабочего дня, без навязчивых звонков</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={basePath}
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              Сбросить фильтры
            </Link>
            <Link
              href={`${basePath}?fitment=universal`}
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              Показать универсальные
            </Link>
          </div>
        </div>

        <form action={requestCarSelectionFormAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="source" value={source} />
          {carLabel && <input type="hidden" name="carInfo" value={carLabel} />}
          <label className="block">
            <span className="g19-label">Имя *</span>
            <input name="name" required minLength={2} className="g19-input" placeholder="Как к вам обращаться" />
          </label>
          <label className="block">
            <span className="g19-label">Телефон *</span>
            <input name="phone" required inputMode="tel" className="g19-input" placeholder="+7 (999) 123-45-67" />
          </label>
          <label className="block sm:col-span-2">
            <span className="g19-label">VIN (17 символов)</span>
            <input name="vin" className="g19-input uppercase" maxLength={17} placeholder="XW7XXXXXXXXXXXXXX" />
          </label>
          <label className="block sm:col-span-2">
            <span className="g19-label">Автомобиль и что ищете</span>
            <textarea
              name="message"
              className="g19-input min-h-20"
              placeholder="Например: Toyota Camry XV70 2019, нужен багажник на гладкую крышу с замками"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" size="sm">
              Отправить заявку на подбор
            </Button>
            <p className="mt-2 text-xs text-ink-400">
              Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.
            </p>
          </div>
        </form>
      </div>
    </Card>
  );
}
