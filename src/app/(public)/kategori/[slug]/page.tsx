import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionArticles } from "@/components/public/SectionArticles";
import { getCategories } from "@/server/queries/articles";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function findCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  return category ? { title: category.name, description: category.description ?? undefined } : {};
}

export default async function CategoryPage({ params }: Props) {
  const category = await findCategory((await params).slug);
  if (!category) notFound();
  return <SectionArticles section={category.section} categorySlug={category.slug} />;
}
