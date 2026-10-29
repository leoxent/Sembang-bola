import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Avatar } from "@/components/admin/Avatar";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { requireAdmin } from "@/lib/auth/session";
import { logout } from "@/server/actions/auth";

export const metadata: Metadata = { title: { absolute: "Sembang Bola Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-4 border-b border-neutral-800 p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-neutral-950">
              SB
            </span>
            <span className="font-semibold">Admin</span>
          </Link>
          <ThemeToggle />
        </div>
        <AdminNav isSuper={session.role === "SUPER_ADMIN"} />
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 transition hover:border-emerald-500/40 hover:text-white"
        >
          View site
          <span aria-hidden className="text-emerald-400">↗</span>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-800 pt-4 md:block">
          <Link href="/admin/profile" className="flex min-w-0 items-center gap-3 rounded-lg p-1 hover:bg-neutral-900" title="My profile">
            <Avatar src={session.avatarUrl} name={session.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{session.name}</span>
              <span className="block text-xs text-neutral-500">{session.role === "SUPER_ADMIN" ? "Main admin" : "Editor"}</span>
            </span>
          </Link>
          <form action={logout} className="md:mt-3">
            <SubmitButton className="btn-secondary w-full" pendingText="Signing out…">Sign out</SubmitButton>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
