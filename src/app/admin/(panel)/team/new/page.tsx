import Link from "next/link";
import { AdminDetailsForm } from "@/components/admin/AdminDetailsForm";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdmin } from "@/server/actions/admins";

export default async function NewAdminPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link href="/admin/team" className="text-sm text-neutral-500 hover:text-neutral-300">← Team</Link>
        <h1 className="mt-2 text-2xl font-semibold">Add admin</h1>
      </header>
      <section className="card p-6">
        <AdminDetailsForm action={createAdmin} mode="create" canEditUsername canEditRole submitLabel="Create admin" />
      </section>
    </div>
  );
}
