"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { USER_ROLES } from "@/lib/constants";
import { createUserAction, resetUserPasswordAction, updateUserAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/admin/actions";
import { CheckboxField, FormActions, FormSection, TextField } from "@/components/admin/form-fields";

/** Создание сотрудника (менеджер или администратор). */
export function UserCreateForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createUserAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;

  return (
    <form action={formAction}>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" className="mb-4">
          Пользователь создан
        </Alert>
      )}
      <FormSection title="Новый сотрудник" columns={1}>
        <TextField label="Имя" name="name" required />
        <TextField label="Email" name="email" type="email" required />
        <TextField label="Телефон" name="phone" />
        <TextField label="Пароль" name="password" type="password" required hint="Минимум 8 символов" />
        <div>
          <label className="g19-label" htmlFor="role">
            Роль
          </label>
          <select id="role" name="role" defaultValue="manager" className="g19-input cursor-pointer">
            {Object.entries(USER_ROLES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <CheckboxField label="Активен" name="isActive" defaultChecked />
      </FormSection>
      <FormActions>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Создать пользователя
        </button>
      </FormActions>
    </form>
  );
}

/** Редактирование профиля и сброс пароля. */
export function UserEditForm({
  userId,
  name,
  phone,
  isActive,
}: {
  userId: string;
  name: string;
  phone: string;
  isActive: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateUserAction, null);
  const [passwordState, passwordAction] = useActionState<ActionState, FormData>(resetUserPasswordAction, null);
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok === true;
  const passwordError = passwordState && "error" in passwordState ? passwordState.error : undefined;
  const passwordOk = passwordState && "ok" in passwordState && passwordState.ok === true;

  return (
    <div className="space-y-6">
      <form action={formAction}>
        <input type="hidden" name="id" value={userId} />
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        {ok && (
          <Alert variant="success" className="mb-4">
            Данные сохранены
          </Alert>
        )}
        <FormSection title="Профиль" columns={1}>
          <TextField label="Имя" name="name" defaultValue={name} required />
          <TextField label="Телефон" name="phone" defaultValue={phone} />
          <CheckboxField label="Активен (может входить)" name="isActive" defaultChecked={isActive} />
        </FormSection>
        <FormActions>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Сохранить
          </button>
        </FormActions>
      </form>

      <form action={passwordAction} className="border-t border-ink-100">
        <input type="hidden" name="id" value={userId} />
        {passwordError && (
          <Alert variant="danger" className="mx-5 mt-4">
            {passwordError}
          </Alert>
        )}
        {passwordOk && (
          <Alert variant="success" className="mx-5 mt-4">
            Пароль изменён, все сессии пользователя закрыты
          </Alert>
        )}
        <FormSection title="Сброс пароля" columns={1} description="Все активные сессии пользователя будут завершены">
          <TextField label="Новый пароль" name="password" type="password" required hint="Минимум 8 символов" />
        </FormSection>
        <FormActions>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Сбросить пароль
          </button>
        </FormActions>
      </form>
    </div>
  );
}
