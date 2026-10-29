import type { Metadata } from "next";
import { SectionArticles } from "@/components/public/SectionArticles";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Artikel",
  description: "Kisah legenda, peraturan bola sepak, sejarah kelab dan pemain, dan macam-macam lagi.",
};

// The feature-articles hub (internally the RENCANA section). Single articles live at /artikel/[slug].
export default function ArtikelPage() {
  return <SectionArticles section="RENCANA" />;
}
