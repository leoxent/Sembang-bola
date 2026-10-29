"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page crashes (e.g. the database is briefly unreachable).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-black tracking-tighter text-amber-400">Kad kuning</p>
      <h1 className="mt-4 text-2xl font-bold">Ada masalah teknikal sekejap.</h1>
      <p className="mt-3 text-neutral-400">Cuba lagi dalam beberapa saat. Kalau masih sama, kami tengah betulkan.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">Cuba lagi</button>
        <Link href="/" className="btn-secondary">Ke laman utama</Link>
      </div>
    </main>
  );
}
