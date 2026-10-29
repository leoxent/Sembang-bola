"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/server/actions/admins";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField, FormMessage } from "./FormField";

export function PasswordForm({
  action,
  requireCurrent,
  submitLabel,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  requireCurrent: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {requireCurrent && (
        <FormField label="Current password" error={errors.currentPassword}>
          <input name="currentPassword" type="password" autoComplete="current-password" className="admin-input sm:w-80" />
        </FormField>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="New password" error={errors.password} hint="At least 10 characters">
          <input name="password" type="password" autoComplete="new-password" className="admin-input" />
        </FormField>
        <FormField label="Repeat new password" error={errors.confirmPassword}>
          <input name="confirmPassword" type="password" autoComplete="new-password" className="admin-input" />
        </FormField>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        <FormMessage message={state.message} />
      </div>
    </form>
  );
}
