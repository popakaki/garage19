import { z } from "zod";
import { DELIVERY_TYPES, PAYMENT_TYPES } from "@/lib/constants";
import { isValidEmail, isValidPhone } from "@/lib/utils";

/**
 * Единая схема оформления заказа: используется и клиентской валидацией,
 * и Server Action `createOrderAction` (повторная проверка на сервере обязательна).
 * Файл без "server-only" — импортируется клиентскими компонентами.
 */

const deliveryTypeValues = Object.keys(DELIVERY_TYPES) as [string, ...string[]];
const paymentTypeValues = Object.keys(PAYMENT_TYPES) as [string, ...string[]];

export const checkoutSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(3, "Укажите ФИО полностью")
      .max(120, "Слишком длинное значение"),
    customerPhone: z
      .string()
      .trim()
      .min(1, "Укажите телефон")
      .refine((value) => isValidPhone(value), "Телефон в формате +7 (999) 123-45-67"),
    customerEmail: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => (value ? value : ""))
      .refine((value) => value === "" || isValidEmail(value), "Проверьте адрес электронной почты"),

    cityId: z.string().trim().min(1, "Выберите город"),

    deliveryType: z.enum(deliveryTypeValues),
    pickupPointCode: z.string().trim().max(64).optional().default(""),
    pickupPointAddress: z.string().trim().max(300).optional().default(""),
    deliveryAddress: z.string().trim().max(300).optional().default(""),
    deliveryComment: z.string().trim().max(500).optional().default(""),

    paymentType: z.enum(paymentTypeValues),

    companyName: z.string().trim().max(200).optional().default(""),
    companyInn: z.string().trim().max(20).optional().default(""),
    companyKpp: z.string().trim().max(20).optional().default(""),
    companyAddress: z.string().trim().max(300).optional().default(""),

    installRequested: z.boolean().default(false),
    installAddress: z.string().trim().max(300).optional().default(""),

    carInfo: z.string().trim().max(200).optional().default(""),
    comment: z.string().trim().max(1000).optional().default(""),

    promoCode: z.string().trim().max(40).optional().default(""),
    /**
     * Согласие с офертой и обработкой персональных данных — обязательное.
     * Значение уже приведено к boolean вызывающим кодом (HTML-checkbox → boolean).
     */
    agreement: z.boolean().refine((value) => value, "Без согласия с офертой заказ оформить нельзя"),
  })
  .superRefine((value, ctx) => {
    const needsPoint = value.deliveryType === "cdek_pvz" || value.deliveryType === "boxberry_pvz" || value.deliveryType === "post";
    if (needsPoint && !value.pickupPointCode) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupPointCode"],
        message: "Выберите пункт выдачи",
      });
    }

    const needsAddress = value.deliveryType === "cdek_courier" || value.deliveryType === "courier_local";
    if (needsAddress && value.deliveryAddress.length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Укажите улицу, дом, квартиру",
      });
    }

    if (value.paymentType === "invoice") {
      if (value.companyName.length < 2) {
        ctx.addIssue({ code: "custom", path: ["companyName"], message: "Укажите название организации" });
      }
      if (!/^\d{10}(\d{2})?$/.test(value.companyInn)) {
        ctx.addIssue({ code: "custom", path: ["companyInn"], message: "ИНН — 10 или 12 цифр" });
      }
    }

    if (value.installRequested && value.installAddress.length < 3) {
      ctx.addIssue({ code: "custom", path: ["installAddress"], message: "Укажите адрес сервиса или «уточню позже»" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutPayload = z.output<typeof checkoutSchema>;

export function checkoutDeliveryLabel(value: string): string {
  return DELIVERY_TYPES[value as keyof typeof DELIVERY_TYPES] ?? value;
}

export function checkoutPaymentLabel(value: string): string {
  return PAYMENT_TYPES[value as keyof typeof PAYMENT_TYPES] ?? value;
}
