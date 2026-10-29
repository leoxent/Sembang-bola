import Link from "next/link";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";

export const metadata = { title: "Halaman tak dijumpai" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="text-7xl font-black tracking-tighter text-emerald-500">404</p>
        <h1 className="mt-4 text-2xl font-bold">Ofsaid! Halaman ni tak wujud.</h1>
        <p className="mt-3 text-neutral-400">
          Mungkin pautan dah lama, atau tersalah taip. Jangan risau, VAR pun selalu salah.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">Ke laman utama</Link>
          <Link href="/berita" className="btn-secondary">Baca berita</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
