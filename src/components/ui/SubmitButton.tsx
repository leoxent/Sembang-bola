"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

/**
 * A form's submit button that shows a spinner while the form's action runs, and can't be double-clicked.
 * In forms with several buttons (name/value, e.g. intent=publish), only the one that was pressed spins.
 */
export function SubmitButton({
  children,
  pendingText,
  className = "btn-secondary",
  name,
  value,
  disabled,
  title,
}: {
  children: React.ReactNode;
  pendingText?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending, data } = useFormStatus();
  const isThisButton = pending && (!name || data?.get(name) === value);

  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      disabled={pending || disabled}
      aria-busy={isThisButton}
      className={`${className} ${pending && !isThisButton ? "opacity-50" : ""}`}
    >
      {isThisButton && <Spinner />}
      {isThisButton && pendingText ? pendingText : children}
    </button>
  );
}
