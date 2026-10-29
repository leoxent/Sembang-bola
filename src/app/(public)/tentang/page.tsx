import type { Metadata } from "next";
import Link from "next/link";
import { InfoSection as Section } from "@/components/public/InfoSection";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tentang kami",
  description: `Apa itu ${SITE_NAME}, bagaimana kami menggunakan AI, dan dari mana data kami datang.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Tentang kami</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Sembang <span className="text-emerald-400">Bola</span>
        </h1>
        <p className="mt-3 text-lg text-neutral-400">
          Tempat lepak peminat bola Malaysia untuk ikuti 5 liga utama Eropah (Premier League, La Liga, Serie A, Bundesliga dan
          Ligue 1) dan Liga Juara-Juara UEFA.
        </p>
      </header>

      <Section title="Apa yang ada di sini">
        <p>
          Skor langsung, keputusan, jadual perlawanan, kedudukan liga dan statistik setiap perlawanan, ditambah laporan, berita dan
          ulasan dalam bahasa Melayu yang santai. Kadang-kadang ada sikit roasting, tapi untuk prestasi di padang sahaja, tak pernah
          peribadi.
        </p>
      </Section>

      <Section id="ai" title="Bagaimana kami guna AI">
        <p>
          Kenalkan <strong>Rex</strong>, penulis AI Sembang Bola. Artikel yang ditulis atau dibantu AI ditanda dengan label{" "}
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-sm text-violet-300">Dibantu AI</span>, dan Rex sentiasa
          dinamakan sebagai penulisnya.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>AI hanya diberi fakta: data perlawanan sebenar atau sumber berita yang dipautkan dalam artikel.</li>
          <li>AI diarahkan supaya tidak mereka petikan, kecederaan, khabar angin atau fakta yang tiada dalam sumber.</li>
          <li>
            <strong>Laporan perlawanan pasukan-pasukan utama dan ringkasan mingguan diterbitkan secara automatik</strong>, kerana ia
            berasaskan data perlawanan rasmi sahaja. Artikel ini ditanda <em>&quot;Diterbitkan automatik&quot;</em>.
          </li>
          <li>
            <strong>Berita, berita viral dan artikel Rex disemak oleh editor manusia</strong> sebelum diterbitkan, dan ditanda
            dengan nama penyemaknya.
          </li>
          <li>Khabar angin perpindahan sentiasa dinyatakan sebagai laporan atau khabar angin, bukan fakta.</li>
        </ul>
        <p>Jumpa kesilapan? Kami akan betulkan secepat mungkin.</p>
      </Section>

      <Section title="Sumber data dan gambar">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Skor, statistik perlawanan dan kedudukan liga: ESPN.</li>
          <li>Berita: setiap artikel berita menyenaraikan sumbernya di bahagian bawah.</li>
          <li>
            Foto dalam artikel: Wikimedia Commons, dengan lesen bebas (Creative Commons). Nama jurugambar dan lesen ditunjukkan di
            bawah setiap foto.
          </li>
          <li>Gambar cover dijana oleh laman web ini sendiri.</li>
        </ul>
      </Section>

      <Section id="penafian" title="Penafian">
        <p>
          {SITE_NAME} ialah projek peribadi bukan komersial, dan tidak berkaitan dengan mana-mana liga, kelab atau pemain. Nama dan
          logo liga serta kelab adalah milik pemilik masing-masing.
        </p>
        <p>
          Kami cuba pastikan semua skor, statistik dan fakta tepat, tetapi data datang daripada pihak ketiga dan sebahagian artikel
          ditulis AI, jadi kesilapan boleh berlaku. Semak sumber rasmi untuk apa-apa yang penting, dan jangan jadikan laman ini
          asas untuk pertaruhan. Roasting dalam artikel ialah gurauan tentang prestasi di padang, bukan pendapat tentang
          sesiapa secara peribadi.
        </p>
      </Section>

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
        <Link href="/" className="text-emerald-400 hover:underline">← Kembali ke laman utama</Link>
        <Link href="/privasi" className="text-emerald-400 hover:underline">Dasar privasi</Link>
      </p>
    </div>
  );
}
