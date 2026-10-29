import Link from "next/link";
import type { CategorySection } from "@prisma/client";
import { SECTION_LABEL, SECTION_PATH } from "@/lib/categories";
import { getCategories, getLatestArticles } from "@/server/queries/articles";
import { ArticleCard } from "./ArticleCard";

const INTRO: Record<CategorySection, string> = {
  BERITA: "Berita panas, laporan perlawanan dan khabar angin dari 5 liga utama Eropah dan Liga Juara-Juara.",
  RENCANA: "Kisah legenda, peraturan bola yang lama dan baru, sejarah kelab dan pemain, dan macam-macam lagi.",
};

/** The Berita and Rencana hubs, and individual category pages: a title, category tabs and an article grid. */
export async function SectionArticles({ section, categorySlug }: { section: CategorySection; categorySlug?: string }) {
  const categories = (await getCategories()).filter((c) => c.section === section);
  const active = categories.find((c) => c.slug === categorySlug);
  const articles = await getLatestArticles({ take: 60, ...(active ? { categorySlug: active.slug } : { section }) });

  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      key={href}
      href={href}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
        isActive ? "bg-emerald-500 font-semibold text-neutral-950" : "bg-neutral-900 text-neutral-300 ring-1 ring-neutral-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">{SECTION_LABEL[section]}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{active?.name ?? SECTION_LABEL[section]}</h1>
        <p className="mt-2 max-w-2xl text-neutral-400">{active?.description ?? INTRO[section]}</p>
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {tab(SECTION_PATH[section], "Semua", !active)}
        {categories.map((c) => tab(`/kategori/${c.slug}`, c.name, c.slug === active?.slug))}
      </nav>

      {articles.length === 0 ? (
        <p className="card px-5 py-12 text-center text-neutral-500">Belum ada artikel di sini. Datang lagi nanti!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
