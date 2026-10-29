"use client";

import { useActionState, useState } from "react";
import type { AdminRole } from "@prisma/client";
import type { AdminFormState } from "@/server/actions/admins";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AvatarInput } from "./AvatarInput";
import { FormField, FormMessage } from "./FormField";

export interface AdminDetails {
  name: string;
  username: string;
  email: string;
  title: string;
  bio: string;
  avatarUrl: string;
  role: AdminRole;
}

interface Props {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  initial?: AdminDetails;
  /** "create" also asks for a password. */
  mode: "create" | "edit";
  canEditUsername: boolean;
  canEditRole: boolean;
  submitLabel: string;
}

const EMPTY: AdminDetails = { name: "", username: "", email: "", title: "", bio: "", avatarUrl: "", role: "EDITOR" };

export function AdminDetailsForm({ action, initial = EMPTY, mode, canEditUsername, canEditRole, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, {});
  // Controlled so input survives a failed submit (React resets uncontrolled forms after an action).
  const [v, setV] = useState(initial);
  const set = (key: keyof AdminDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <AvatarInput name="avatarUrl" initial={initial.avatarUrl} displayName={v.name} error={errors.avatarUrl} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Display name" error={errors.name} hint="Shown as the article byline">
          <input name="name" value={v.name} onChange={set("name")} className="admin-input" autoComplete="off" />
        </FormField>
        <FormField label="Username" error={errors.username} hint={canEditUsername ? "Used to sign in" : "Only the main admin can change this"}>
          <input
            name="username"
            value={v.username}
            onChange={set("username")}
            readOnly={!canEditUsername}
            className={`admin-input font-mono ${canEditUsername ? "" : "opacity-60"}`}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>
        <FormField label="Email" error={errors.email} hint="Can also be used to sign in">
          <input name="email" type="email" value={v.email} onChange={set("email")} className="admin-input" autoComplete="off" />
        </FormField>
        <FormField label="Job title" error={errors.title} hint="Optional, e.g. Senior Writer">
          <input name="title" value={v.title} onChange={set("title")} className="admin-input" />
        </FormField>
      </div>

      <FormField label="Bio" error={errors.bio} hint={`${v.bio.length}/500 · shown on the author's articles`}>
        <textarea name="bio" value={v.bio} onChange={set("bio")} rows={3} className="admin-input resize-y" />
      </FormField>

      {canEditRole && (
        <FormField label="Role" error={errors.role}>
          <select name="role" value={v.role} onChange={set("role")} className="admin-input sm:w-72">
            <option value="EDITOR">Editor: write and edit articles</option>
            <option value="SUPER_ADMIN">Main admin: everything, including the team</option>
          </select>
        </FormField>
      )}

      {mode === "create" && (
        <div className="grid gap-5 border-t border-neutral-800 pt-6 sm:grid-cols-2">
          <FormField label="Password" error={errors.password} hint="At least 10 characters. Share it with them privately.">
            <input name="password" type="password" className="admin-input" autoComplete="new-password" />
          </FormField>
          <FormField label="Repeat password" error={errors.confirmPassword}>
            <input name="confirmPassword" type="password" className="admin-input" autoComplete="new-password" />
          </FormField>
        </div>
      )}

      <div className="flex items-center gap-4">
        <SubmitButton className="btn-primary" pendingText="Saving…">{submitLabel}</SubmitButton>
        <FormMessage message={state.message} />
      </div>
    </form>
  );
}
