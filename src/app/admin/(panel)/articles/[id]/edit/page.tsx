import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { prisma } from "@/lib/prisma";
import { deleteArticle } from "@/server/actions/articles";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [article, leagues, categories] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.league.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, section: true } }),
  ]);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/articles" className="text-sm text-neutral-500 hover:text-neutral-300">← Articles</Link>
          <h1 className="mt-2 truncate text-2xl font-semibold">Edit article</h1>
          {article.status !== "DRAFT" && (
            <Link href={`/artikel/${article.slug}`} target="_blank" className="mt-1 inline-block text-sm text-emerald-400 hover:underline">
              View on site ↗
            </Link>
          )}
        </div>
        <ConfirmButton action={deleteArticle.bind(null, article.id)} confirm={`Delete "${article.title}"? This can't be undone.`}>
          Delete
        </ConfirmButton>
      </header>
      <ArticleForm
        key={article.id}
        notice={created ? "Article created" : undefined}
        leagues={leagues}
        categories={categories}
        article={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? "",
          body: article.body,
          coverImageUrl: article.coverImageUrl ?? "",
          tags: article.tags.join(", "),
          categoryId: article.categoryId ?? "",
          leagueId: article.leagueId ?? "",
          status: article.status,
          scheduledFor: article.scheduledFor?.toISOString() ?? null,
          updatedAt: article.updatedAt.toISOString(),
        }}
      />
    </div>
  );
}
