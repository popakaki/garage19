"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import {
  updateOrderAction,
  updateOrderPaymentStatusAction,
  updateOrderStatusAction,
} from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";

/**
 * Формы карточки заказа: смена статуса, статуса оплаты и редактирование
 * контактных данных. Работают без JavaScript (обычный POST) и показывают
 * ошибки через useActionState, когда JS включён.
 */

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if ("error" in state && state.error) return <Alert variant="danger">{state.error}</Alert>;
  if ("ok" in state && state.ok) return <Alert variant="success">Сохранено</Alert>;
  return null;
}

export function OrderStatusForms({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
}) {
  const [statusState, statusAction, statusPending] = useActionState<ActionState, FormData>(
    updateOrderStatusAction,
    null,
  );
  const [paymentState, paymentAction, paymentPending] = useActionState<ActionState, FormData>(
    updateOrderPaymentStatusAction,
    null,
  );

  return (
    <div className="space-y-4">
      <form action={statusAction} className="space-y-3">
        <input type="hidden" name="id" value={orderId} />
        <div>
          <label className="g19-label" htmlFor="order-status">
            Статус заказа
          </label>
          <select id="order-status" name="status" defaultValue={status} className="g19-input cursor-pointer">
            {Object.entries(ORDER_STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="g19-label" htmlFor="status-comment">
            Комментарий к изменению
          </label>
          <input
            id="status-comment"
            name="comment"
            placeholder="Необязательно"
            className="g19-input"
          />
        </div>
        <Feedback state={statusState} />
        <button
          type="submit"
          disabled={statusPending}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {statusPending ? "Сохраняем…" : "Сменить статус"}
        </button>
      </form>

      <form action={paymentAction} className="space-y-3 border-t border-ink-100 pt-4">
        <input type="hidden" name="id" value={orderId} />
        <div>
          <label className="g19-label" htmlFor="payment-status">
            Статус оплаты
          </label>
          <select
            id="payment-status"
            name="paymentStatus"
            defaultValue={paymentStatus}
            className="g19-input cursor-pointer"
          >
            {Object.entries(PAYMENT_STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Feedback state={paymentState} />
        <button
          type="submit"
          disabled={paymentPending}
          className="inline-flex w-full items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          {paymentPending ? "Сохраняем…" : "Обновить оплату"}
        </button>
      </form>
    </div>
  );
}

export type OrderEditDefaults = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cityName: string;
  deliveryType: string;
  deliveryProvider: string;
  deliveryAddress: string;
  pickupPointAddress: string;
  paymentType: string;
  comment: string;
  managerComment: string;
  carInfo: string;
};

export function OrderDetailsForm({
  defaults,
  deliveryTypes,
  paymentTypes,
}: {
  defaults: OrderEditDefaults;
  deliveryTypes: Record<string, string>;
  paymentTypes: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateOrderAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={defaults.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="g19-label" htmlFor="customerName">
            Имя клиента
          </label>
          <input id="customerName" name="customerName" defaultValue={defaults.customerName} className="g19-input" required />
        </div>
        <div>
          <label className="g19-label" htmlFor="customerPhone">
            Телефон
          </label>
          <input id="customerPhone" name="customerPhone" defaultValue={defaults.customerPhone} className="g19-input" required />
        </div>
        <div>
          <label className="g19-label" htmlFor="customerEmail">
            Email
          </label>
          <input id="customerEmail" name="customerEmail" type="email" defaultValue={defaults.customerEmail} className="g19-input" />
        </div>
        <div>
          <label className="g19-label" htmlFor="cityName">
            Город
          </label>
          <input id="cityName" name="cityName" defaultValue={defaults.cityName} className="g19-input" />
        </div>
        <div>
          <label className="g19-label" htmlFor="deliveryType">
            Способ доставки
          </label>
          <select id="deliveryType" name="deliveryType" defaultValue={defaults.deliveryType} className="g19-input cursor-pointer">
            {Object.entries(deliveryTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="g19-label" htmlFor="deliveryProvider">
            Служба доставки
          </label>
          <input
            id="deliveryProvider"
            name="deliveryProvider"
            defaultValue={defaults.deliveryProvider}
            placeholder="cdek, boxberry, post, own"
            className="g19-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="g19-label" htmlFor="deliveryAddress">
            Адрес доставки
          </label>
          <input id="deliveryAddress" name="deliveryAddress" defaultValue={defaults.deliveryAddress} className="g19-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="g19-label" htmlFor="pickupPointAddress">
            Пункт выдачи (адрес и код)
          </label>
          <input
            id="pickupPointAddress"
            name="pickupPointAddress"
            defaultValue={defaults.pickupPointAddress}
            className="g19-input"
          />
        </div>
        <div>
          <label className="g19-label" htmlFor="paymentType">
            Способ оплаты
          </label>
          <select id="paymentType" name="paymentType" defaultValue={defaults.paymentType} className="g19-input cursor-pointer">
            {Object.entries(paymentTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="g19-label" htmlFor="carInfo">
            Автомобиль клиента
          </label>
          <input id="carInfo" name="carInfo" defaultValue={defaults.carInfo} className="g19-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="g19-label" htmlFor="comment">
            Комментарий клиента
          </label>
          <textarea id="comment" name="comment" rows={2} defaultValue={defaults.comment} className="g19-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="g19-label" htmlFor="managerComment">
            Комментарий менеджера
          </label>
          <textarea
            id="managerComment"
            name="managerComment"
            rows={3}
            defaultValue={defaults.managerComment}
            placeholder="Виден только сотрудникам"
            className="g19-input"
          />
        </div>
      </div>

      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
      >
        {pending ? "Сохраняем…" : "Сохранить изменения"}
      </button>
    </form>
  );
}

/** Кнопка печати: печатает текущую страницу (см. @media print в globals.css). */
export function PrintOrderButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
    >
      Печать
    </button>
  );
}
