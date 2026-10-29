import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { requireSuperAdmin } from "@/lib/auth/session";
import { PROTECTED_CATEGORY_SLUGS, SECTION_LABEL } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory, updateCategory } from "@/server/actions/categories";

export default async function CategoriesPage() {
  await requireSuperAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { articles: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-neutral-500">
          <strong className="text-neutral-300">Berita</strong> categories appear under /berita (news and match reports);{" "}
          <strong className="text-neutral-300">Artikel</strong> categories appear under /artikel (features like legends, rules and history).
        </p>
      </header>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium">Add a category</h2>
        <CategoryForm action={createCategory} submitLabel="Add" />
      </section>

      {(["BERITA", "RENCANA"] as const).map((section) => (
        <section key={section} className="card overflow-hidden">
          <h2 className="border-b border-neutral-800 px-5 py-3 font-medium">{SECTION_LABEL[section]}</h2>
          <ul className="divide-y divide-neutral-800">
            {categories
              .filter((c) => c.section === section)
              .map((c) => (
                <li key={c.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <Link href={`/kategori/${c.slug}`} target="_blank" className="font-mono text-emerald-400 hover:underline">/kategori/{c.slug}</Link>
                    <Link href={`/admin/articles?category=${c.slug}`} className="hover:text-neutral-300">{c._count.articles} articles</Link>
                    {PROTECTED_CATEGORY_SLUGS.includes(c.slug) ? (
                      <span>· used for AI articles</span>
                    ) : (
                      <span className="ml-auto">
                        <ConfirmButton
                          action={deleteCategory.bind(null, c.id)}
                          confirm={`Delete "${c.name}"? Its ${c._count.articles} articles are kept, but will have no category.`}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </span>
                    )}
                  </div>
                  <CategoryForm
                    action={updateCategory.bind(null, c.id)}
                    submitLabel="Save"
                    initial={{ name: c.name, section: c.section, description: c.description ?? "", sortOrder: c.sortOrder }}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
