import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminDetailsForm } from "@/components/admin/AdminDetailsForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { changePassword, deleteAdmin, setAdminActive, updateAdmin } from "@/server/actions/admins";

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  const { id } = await params;
  if (id === session.adminId) redirect("/admin/profile");

  const admin = await prisma.admin.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
  if (!admin) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link href="/admin/team" className="text-sm text-neutral-500 hover:text-neutral-300">← Team</Link>
        <h1 className="mt-2 text-2xl font-semibold">{admin.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          @{admin.username} · {admin._count.articles} articles ·{" "}
          {admin.isBot ? "AI writer" : admin.lastLoginAt ? `last login ${admin.lastLoginAt.toLocaleString("en-GB")}` : "never signed in"}
          {!admin.isActive && <span className="text-red-400"> · deactivated</span>}
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-5 font-medium">Profile</h2>
        <AdminDetailsForm
          action={updateAdmin.bind(null, admin.id)}
          mode="edit"
          canEditUsername={!admin.isBot}
          canEditRole={!admin.isBot}
          submitLabel="Save changes"
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

      {admin.isBot ? (
        <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-neutral-400">
          🤖 Rex is the site&apos;s AI writer. It has no password and can never sign in, so it can&apos;t be deactivated or deleted.
          You can change its name, photo, title and bio above. They appear on its articles.
        </p>
      ) : (
      <>
      <section className="card p-6">
        <h2 className="font-medium">Reset password</h2>
        <p className="mb-5 mt-1 text-sm text-neutral-500">Sets a new password and signs them out on every device.</p>
        <PasswordForm action={changePassword.bind(null, admin.id)} requireCurrent={false} submitLabel="Reset password" />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-medium">Access</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-neutral-500">
            {admin.isActive
              ? "Deactivating blocks sign-in immediately but keeps their account and articles."
              : "This admin can't sign in. Reactivate to restore access."}
          </p>
          <ConfirmButton
            action={setAdminActive.bind(null, admin.id, !admin.isActive)}
            confirm={admin.isActive ? `Deactivate ${admin.name}? They'll be signed out immediately.` : `Reactivate ${admin.name}?`}
            className={admin.isActive ? "btn-danger" : "btn-secondary"}
          >
            {admin.isActive ? "Deactivate" : "Reactivate"}
          </ConfirmButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-4">
          <p className="max-w-md text-sm text-neutral-500">
            Permanently delete this account. Their {admin._count.articles} articles stay, without an author.
          </p>
          <ConfirmButton action={deleteAdmin.bind(null, admin.id)} confirm={`Permanently delete ${admin.name}'s account? This can't be undone.`}>
            Delete account
          </ConfirmButton>
        </div>
      </section>
      </>
      )}
    </div>
  );
}
