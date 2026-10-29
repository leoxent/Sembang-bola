import { AdminRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminDetailsForm } from "@/components/admin/AdminDetailsForm";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { changePassword, updateAdmin } from "@/server/actions/admins";

export default async function ProfilePage() {
  const session = await requireAdmin();
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin) notFound();
  const isSuper = admin.role === AdminRole.SUPER_ADMIN;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">My profile</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as @{admin.username} · {isSuper ? "Main admin" : "Editor"}
        </p>
      </header>

      <section className="card p-6">
        <AdminDetailsForm
          action={updateAdmin.bind(null, admin.id)}
          mode="edit"
          canEditUsername={isSuper}
          canEditRole={false}
          submitLabel="Save profile"
          initial={{
            name: admin.name,
            username: admin.username,
            email: admin.email,
            title: admin.title ?? "",
            bio: admin.bio ?? "",
            avatarUrl: admin.avatarUrl ?? "",
            role: admin.role,
          }}
        />
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Change password</h2>
        <p className="mb-5 mt-1 text-sm text-neutral-500">You'll stay signed in here; other devices will be signed out.</p>
        <PasswordForm action={changePassword.bind(null, admin.id)} requireCurrent submitLabel="Change password" />
      </section>
    </div>
  );
}
