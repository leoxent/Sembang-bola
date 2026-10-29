import type { Metadata } from "next";
import Link from "next/link";
import { InfoSection as Section } from "@/components/public/InfoSection";
import { SITE_CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dasar privasi",
  description: `Data apa yang ${SITE_NAME} kumpul, kenapa, dan apa hak anda.`,
};

const UPDATED = "29 Oktober 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Dasar privasi</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Data anda, ringkasnya</h1>
        <p className="mt-3 text-lg text-neutral-400">
          Kami kumpul sesedikit mungkin. Anda tak perlu akaun untuk membaca {SITE_NAME}, dan kami tidak menjual atau berkongsi
          data dengan pengiklan.
        </p>
        <p className="mt-2 text-sm text-neutral-500">Kemas kini terakhir: {UPDATED}</p>
      </header>

      <Section title="Untuk pembaca">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Tiada pendaftaran, tiada borang, dan tiada cookie pengiklanan atau penjejakan.</li>
          <li>
            <strong>Statistik lawatan:</strong> kami guna Vercel Web Analytics, yang tidak memakai cookie. Ia hanya mengira data
            agregat seperti halaman yang dibaca, negara, jenis peranti dan laman yang merujuk anda, tanpa mengenal pasti anda
            secara peribadi.
          </li>
          <li>
            <strong>Pilihan tema</strong> (cerah atau gelap) disimpan dalam pelayar anda sendiri, bukan di pelayan kami.
          </li>
          <li>
            <strong>Log teknikal:</strong> penyedia hosting kami (Vercel) dan pangkalan data (Supabase, Singapura) menyimpan log
            sementara seperti alamat IP dan masa permintaan, untuk keselamatan dan membaiki ralat.
          </li>
          <li>
            Foto dalam artikel dimuatkan dari Wikimedia Commons, dan pautan sumber membawa anda ke laman lain. Laman-laman itu
            tertakluk kepada dasar privasi masing-masing.
          </li>
        </ul>
      </Section>

      <Section title="Untuk editor (admin)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Akaun admin menyimpan nama, nama pengguna, emel, gambar profil dan bio. Kata laluan disimpan dalam bentuk yang disulitkan
            (hash), jadi tiada siapa boleh membacanya, termasuk kami.
          </li>
          <li>Satu cookie sesi wajib digunakan untuk kekal log masuk. Ia tamat selepas 7 hari.</li>
          <li>
            Cubaan log masuk yang gagal direkod bersama alamat IP untuk menghalang serangan meneka kata laluan. Rekod ini dipadam
            secara automatik.
          </li>
          <li>Nama dan bio editor dipaparkan pada artikel yang mereka tulis atau semak.</li>
        </ul>
      </Section>

      <Section title="AI">
        <p>
          Artikel Rex dijana menggunakan model AI Anthropic. Yang dihantar kepada AI hanyalah data perlawanan dan sumber berita
          awam, tidak pernah data pembaca.
        </p>
      </Section>

      <Section title="Hak anda">
        <p>
          Selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA), anda boleh minta untuk melihat, membetulkan atau memadam data
          peribadi anda yang kami simpan.{" "}
          {SITE_CONTACT_EMAIL ? (
            <>
              Hubungi kami di{" "}
              <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">
                {SITE_CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            "Hubungi pentadbir laman ini."
          )}
        </p>
      </Section>

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
        <Link href="/" className="text-emerald-400 hover:underline">← Kembali ke laman utama</Link>
        <Link href="/tentang#penafian" className="text-emerald-400 hover:underline">Penafian</Link>
      </p>
    </div>
  );
}
