import Link from "next/link";
import { Avatar } from "@/components/admin/Avatar";
import { FormMessage } from "@/components/admin/FormField";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const session = await requireSuperAdmin();
  const { created } = await searchParams;
  const admins = await prisma.admin.findMany({
    orderBy: [{ role: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      title: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      isBot: true,
      lastLoginAt: true,
      _count: { select: { articles: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-neutral-500">People who can sign in to this dashboard.</p>
        </div>
        <Link href="/admin/team/new" className="btn-primary">Add admin</Link>
      </header>

      {created && <FormMessage message={`Admin @${created} created. Share their username and password with them privately.`} />}

      <ul className="card divide-y divide-neutral-800">
        {admins.map((a) => (
          <li key={a.id}>
            <Link
              href={a.id === session.adminId ? "/admin/profile" : `/admin/team/${a.id}`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-neutral-900 ${a.isActive ? "" : "opacity-50"}`}
            >
              <Avatar src={a.avatarUrl} name={a.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {a.name}
                  {a.id === session.adminId && <span className="ml-2 text-xs font-normal text-neutral-500">(you)</span>}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  @{a.username}
                  {a.title && ` · ${a.title}`} · {a._count.articles} articles
                </p>
              </div>
              <div className="hidden text-right text-xs text-neutral-500 sm:block">
                {a.isBot ? "Writes automatically" : a.lastLoginAt ? `Last login ${a.lastLoginAt.toLocaleDateString("en-GB")}` : "Never signed in"}
              </div>
              {a.isBot ? (
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">🤖 AI writer</span>
              ) : !a.isActive ? (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">deactivated</span>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.role === "SUPER_ADMIN" ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {a.role === "SUPER_ADMIN" ? "main admin" : "editor"}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
