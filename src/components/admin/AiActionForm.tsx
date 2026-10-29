"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AiActionState } from "@/server/actions/ai";

/** A small form that runs a server action and shows its result message. */
export function AiActionForm({
  action,
  label,
  pendingLabel,
  primary = false,
  children,
}: {
  action: (prev: AiActionState, fd: FormData) => Promise<AiActionState>;
  label: string;
  pendingLabel: string;
  primary?: boolean;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <SubmitButton className={primary ? "btn-primary" : "btn-secondary"} pendingText={pendingLabel}>
          {label}
        </SubmitButton>
      </div>
      {state.message && <p className="text-xs text-emerald-400">{state.message}</p>}
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
