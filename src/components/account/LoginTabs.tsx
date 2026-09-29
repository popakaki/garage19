"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { LoginForm, RegisterForm, ResetRequestForm } from "@/components/account/AuthForms";

/**
 * Вход и регистрация на одной странице (вкладки), плюс восстановление пароля
 * и поиск гостевого заказа. Без JavaScript доступны все три формы сразу.
 */

type Tab = "login" | "register" | "reset";

const TABS: { id: Tab; label: string }[] = [
  { id: "login", label: "Вход" },
  { id: "register", label: "Регистрация" },
  { id: "reset", label: "Забыли пароль?" },
];

export function LoginTabs({
  initialTab = "login",
  next,
}: {
  initialTab?: Tab;
  next?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <Card className="overflow-hidden">
      <div className="flex border-b border-ink-100" role="tablist" aria-label="Вход и регистрация">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              tab === item.id
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-ink-500 hover:bg-ink-50 hover:text-ink-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        {/* Формы рендерятся все: при отключённом JS вкладки не переключаются,
            но любая из них доступна и работоспособна. */}
        <div hidden={tab !== "login"}>
          <LoginForm next={next} />
        </div>
        <div hidden={tab !== "register"}>
          <RegisterForm />
        </div>
        <div hidden={tab !== "reset"}>
          <ResetRequestForm />
        </div>
      </div>
    </Card>
  );
}
