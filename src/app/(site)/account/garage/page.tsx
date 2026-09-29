import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Badge, ButtonLink, Card, EmptyState, Section } from "@/components/ui";
import { AddCarForm, CarCascadeFields } from "@/components/account/CarCascadeFields";
import { requireUserPage } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSavedCarsWithCounts } from "@/lib/queries";
import { listCarBrands } from "@/lib/garage";
import { formatDate, productWord } from "@/lib/utils";
import { saveCarAction, deleteCarAction, setPrimaryCarAction, vinRequestAction } from "@/lib/actions/account";
import { voidAction } from "@/lib/form-action";
import { buildMetadata } from "@/lib/seo";

/**
 * /account/garage — «Гараж»: сохранённые автомобили (CRUD) + подбор товаров.
 *
 * Ключевая функция проекта: ни у одного конкурента нет сохранения авто.
 * Для каждого авто показываем количество подходящих товаров и ссылку
 * на каталог с фильтром по марке/модели/поколению.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Мой гараж — Garage19",
    description:
      "Сохраните свои автомобили и подбирайте багажники, автобоксы, велокрепления и фаркопы под каждую машину.",
    path: "/account/garage",
    noIndex: true,
  });
}

function catalogHref(car: {
  brand: { slug: string };
  model: { slug: string } | null;
  generation: { slug: string } | null;
}): string {
  const params = new URLSearchParams({ marka: car.brand.slug });
  if (car.model?.slug) params.set("model", car.model.slug);
  if (car.generation?.slug) params.set("pokolenie", car.generation.slug);
  return `/catalog?${params.toString()}`;
}

export default async function AccountGaragePage() {
  const user = await requireUserPage("/account");

  const [cars, brands] = await Promise.all([getSavedCarsWithCounts(user.id), listCarBrands()]);

  const brandOptions = brands.map((brand) => ({ id: brand.id, name: brand.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Мой гараж</h1>
          <p className="mt-1 text-sm text-ink-500">
            Сохраните автомобили — и мы будем подбирать товары под каждую машину: багажники на крышу, автобоксы,
            велокрепления, лыжные крепления и фаркопы.
          </p>
        </div>
        <Badge variant="brand">{cars.length} авто</Badge>
      </div>

      {cars.length === 0 ? (
        <EmptyState
          title="Гараж пока пуст"
          description="Добавьте автомобиль — марку, модель и поколение. Дальше подбор товаров будет в один клик."
          action={
            <div className="w-full max-w-2xl text-left">
              <Card className="px-5 py-5">
                <AddCarForm brands={brandOptions} />
              </Card>
            </div>
          }
        />
      ) : (
        <>
          <ul className="space-y-4">
            {cars.map((car) => {
              const title = car.label || [car.brand.name, car.model?.name].filter(Boolean).join(" ");
              const subtitle = [car.model?.name, car.generation?.name, car.modification?.name]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={car.id}>
                  <Card className="overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
                          {car.isPrimary && <Badge variant="brand">Моя машина</Badge>}
                          {!car.model && <Badge variant="warning">Уточните модель</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-ink-500">{subtitle || "Модель не указана"}</p>
                        <p className="mt-1 text-xs text-ink-400">Добавлено {formatDate(car.createdAt)}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-ink-900">{car.productsCount}</p>
                        <p className="text-xs text-ink-500">{productWord(car.productsCount)} подходит</p>
                        <ButtonLink href={catalogHref(car)} size="sm" className="mt-2">
                          Показать товары
                        </ButtonLink>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ButtonLink href={`${catalogHref(car)}&kategoriya=bagazhniki`} variant="outline" size="xs">
                          Багажники
                        </ButtonLink>
                        <ButtonLink href={`${catalogHref(car)}&kategoriya=avtoboksy`} variant="outline" size="xs">
                          Автобоксы
                        </ButtonLink>
                        <ButtonLink href={`${catalogHref(car)}&kategoriya=farkopy`} variant="outline" size="xs">
                          Фаркопы
                        </ButtonLink>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {!car.isPrimary && (
                          <form action={voidAction(setPrimaryCarAction)}>
                            <input type="hidden" name="id" value={car.id} />
                            <button
                              type="submit"
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-white hover:text-brand-700"
                            >
                              Сделать основной
                            </button>
                          </form>
                        )}
                        <form action={voidAction(deleteCarAction)}>
                          <input type="hidden" name="id" value={car.id} />
                          <button
                            type="submit"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-400 transition hover:bg-white hover:text-danger-600"
                          >
                            Удалить из гаража
                          </button>
                        </form>
                      </div>
                    </div>

                    <details className="border-t border-ink-100 px-5 py-3">
                      <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                        Изменить данные автомобиля
                      </summary>
                      <form action={voidAction((formData: FormData) => saveCarAction({}, formData))} className="mt-4">
                        <input type="hidden" name="id" value={car.id} />
                        <CarCascadeFields
                          brands={brandOptions}
                          idPrefix={`car-${car.id}`}
                          initial={{
                            brandId: car.brandId,
                            modelId: car.modelId ?? undefined,
                            generationId: car.generationId ?? undefined,
                            modificationId: car.modificationId ?? undefined,
                            isPrimary: car.isPrimary,
                            label: car.label ?? "",
                          }}
                        />
                        <button
                          type="submit"
                          className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                        >
                          Сохранить изменения
                        </button>
                      </form>
                    </details>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Section title="Добавить ещё автомобиль" className="py-0">
            <Card className="px-5 py-5">
              <AddCarForm brands={brandOptions} />
            </Card>
          </Section>
        </>
      )}

      <Alert variant="info" title="Нет вашей модификации?">
        Пришлите VIN — подберём крепёж и фаркоп вручную. Это бесплатно и занимает до одного рабочего дня.
      </Alert>

      <Card className="px-5 py-5">
        <h2 className="text-base font-semibold text-ink-900">Подбор по VIN</h2>
        <p className="mt-1 text-sm text-ink-500">
          Укажите VIN и телефон — менеджер проверит комплектацию и пришлёт точный список подходящих товаров.
        </p>
        <form action={voidAction(vinRequestAction)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="g19-label">VIN (17 символов)</span>
            <input
              name="vin"
              placeholder="XW8ZZZ61ZJG000000"
              maxLength={17}
              className="g19-input uppercase"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="g19-label">Телефон для ответа</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={user.phone ?? ""}
              placeholder="+7 (___) ___-__-__"
              className="g19-input"
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="g19-label">Комментарий</span>
            <input name="carInfo" placeholder="Например: нужен фаркоп с электрикой" className="g19-input" />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-brand-300"
            >
              Отправить заявку на подбор
            </button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-ink-400">
        Не знаете поколение? Сохраните авто только по марке и модели — подберём товары и уточним детали по VIN.
      </p>
    </div>
  );
}
