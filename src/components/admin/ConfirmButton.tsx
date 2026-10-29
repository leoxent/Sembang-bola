"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";

/** A form with one submit button that asks for confirmation first. `action` is a bound server action. */
export function ConfirmButton({
  action,
  confirm: message,
  children,
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  confirm: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
