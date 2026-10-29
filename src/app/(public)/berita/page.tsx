import type { Metadata } from "next";
import { SectionArticles } from "@/components/public/SectionArticles";

export const revalidate = 60;
export const metadata: Metadata = { title: "Berita", description: "Berita panas, laporan perlawanan dan khabar angin dari 5 liga utama Eropah dan Liga Juara-Juara." };

export default function BeritaPage() {
  return <SectionArticles section="BERITA" />;
}
