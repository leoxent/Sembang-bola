import Link from "next/link";
import { SITE_NAME, SITE_TIMEZONE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-neutral-500 sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Projek peribadi, bukan komersial. ·{" "}
          <Link href="/tentang" className="text-neutral-400 hover:text-white">Tentang kami</Link>
        </p>
        <p>
          Data perlawanan: ESPN · Waktu dipaparkan mengikut waktu {SITE_TIMEZONE.split("/").pop()!.replace("_", " ")}
        </p>
      </div>
    </footer>
  );
}
