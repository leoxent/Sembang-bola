"use client";

import { useActionState, useState } from "react";
import type { CategoryFormState } from "@/server/actions/categories";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "./FormField";

interface Values {
  name: string;
  section: "BERITA" | "RENCANA";
  description: string;
  sortOrder: number;
}

/** One row of the categories page: create (no `initial`) or edit an existing category. */
export function CategoryForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: CategoryFormState, fd: FormData) => Promise<CategoryFormState>;
  initial?: Values;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [v, setV] = useState<Values>(initial ?? { name: "", section: "RENCANA", description: "", sortOrder: 20 });
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_150px_1.6fr_80px_auto]">
        <input name="name" value={v.name} onChange={set("name")} placeholder="Name, e.g. Taktik" className="admin-input" aria-label="Name" />
        <select name="section" value={v.section} onChange={set("section")} className="admin-input" aria-label="Section">
          <option value="BERITA">Berita</option>
          <option value="RENCANA">Artikel</option>
        </select>
        <input name="description" value={v.description} onChange={set("description")} placeholder="Short description (shown on its page)" className="admin-input" aria-label="Description" />
        <input name="sortOrder" type="number" min={0} max={999} value={v.sortOrder} onChange={set("sortOrder")} className="admin-input" aria-label="Order" title="Order (lower shows first)" />
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
      {Object.values(errors).filter(Boolean).map((e) => (
        <p key={e} className="text-xs text-red-400">{e}</p>
      ))}
      <FormMessage message={state.message} />
    </form>
  );
}
