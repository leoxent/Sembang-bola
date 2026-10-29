import Link from "next/link";
import { ArticleStatus, type Prisma } from "@prisma/client";
import { OriginBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/prisma";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Drafts", value: ArticleStatus.DRAFT },
  { label: "Scheduled", value: ArticleStatus.SCHEDULED },
  { label: "Published", value: ArticleStatus.PUBLISHED },
  { label: "Archived", value: ArticleStatus.ARCHIVED },
];

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; category?: string }> }) {
  const params = await searchParams;
  const status = Object.values(ArticleStatus).find((s) => s === params.status);
  const q = params.q?.trim();
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } });
  const category = categories.find((c) => c.slug === params.category)?.slug;

  const where: Prisma.ArticleWhereInput = {
    ...(status && { status }),
    ...(category && { category: { slug: category } }),
    ...(q && { title: { contains: q, mode: "insensitive" } }),
  };
  const articles = await prisma.article.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      origin: true,
      updatedAt: true,
      publishedAt: true,
      author: { select: { name: true } },
      league: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const href = (next: { status?: string; category?: string }) => {
    const sp = new URLSearchParams();
    const s = "status" in next ? next.status : status;
    const c = "category" in next ? next.category : category;
    if (s) sp.set("status", s);
    if (c) sp.set("category", c);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return `/admin/articles${qs ? `?${qs}` : ""}`;
  };
  const filterHref = (value?: string) => href({ status: value });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <Link href="/admin/articles/new" className="btn-primary">New article</Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg border border-neutral-800 p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={filterHref(f.value)}
              className={`rounded-md px-3 py-1 text-sm ${
                status === f.value ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="ml-auto w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          {category && <input type="hidden" name="category" value={category} />}
          <input name="q" defaultValue={q} placeholder="Search titles…" className="admin-input" />
        </form>
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {[{ slug: undefined, name: "All categories" }, ...categories].map((c) => (
          <Link
            key={c.name}
            href={href({ category: c.slug })}
            className={`rounded-full px-3 py-1 text-xs ${
              category === c.slug ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="card overflow-hidden">
        {articles.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">
            {q || status || category ? "No articles match this filter." : "No articles yet."}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {articles.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/articles/${a.id}/edit`} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-900">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {[a.category?.name ?? "No category", a.league?.name, a.author?.name ?? "AI", `updated ${a.updatedAt.toLocaleDateString("en-GB")}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <OriginBadge origin={a.origin} />
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
