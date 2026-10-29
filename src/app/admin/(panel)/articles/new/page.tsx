import Link from "next/link";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { prisma } from "@/lib/prisma";

export default async function NewArticlePage() {
  const [leagues, categories] = await Promise.all([
    prisma.league.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, section: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <Link href="/admin/articles" className="text-sm text-neutral-500 hover:text-neutral-300">← Articles</Link>
        <h1 className="mt-2 text-2xl font-semibold">New article</h1>
      </header>
      <ArticleForm leagues={leagues} categories={categories} />
    </div>
  );
}
