"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login, type LoginState } from "@/server/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="mb-1.5 block text-sm text-neutral-400">Username or email</span>
        <input name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="admin-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-neutral-400">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="admin-input" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
