"use client";

import { useState, useTransition } from "react";
import { commonsMarkdown, type CommonsImage } from "@/lib/wikimedia";
import { Spinner } from "@/components/ui/Spinner";
import { searchImages } from "@/server/actions/images";

/** Search Wikimedia Commons and insert a credited image into the article body at the cursor. */
export function ImagePicker({ suggestions, onInsert }: { suggestions: string[]; onInsert: (markdown: string) => void }) {
  const [query, setQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<CommonsImage[] | null>(null);
  const [error, setError] = useState<string>();
  const [inserted, setInserted] = useState<string>();
  const [pending, startTransition] = useTransition();

  const search = (q: string) => {
    setQuery(q);
    setInserted(undefined);
    startTransition(async () => {
      const r = await searchImages(q);
      setError(r.error);
      setImages(r.images ?? null);
    });
  };

  return (
    <details className="card overflow-hidden" open={images !== null}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Images from Wikimedia Commons <span className="font-normal text-neutral-500">(free to reuse, credit added automatically)</span>
      </summary>
      <div className="space-y-3 border-t border-neutral-800 p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // don't submit the article form
                search(query);
              }
            }}
            placeholder="Luka Modrić, San Siro, Mikel Arteta…"
            className="admin-input"
          />
          <button type="button" onClick={() => search(query)} disabled={pending} className="btn-secondary shrink-0">
            {pending && <Spinner />}
            {pending ? "Searching…" : "Search"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => search(s)} className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700">
                {s}
              </button>
            ))}
          </div>
        )}
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional), e.g. Luka Modrić masuk sebagai pemain gantian" className="admin-input" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {inserted && <p className="text-xs text-emerald-400">Inserted &quot;{inserted}&quot; at the cursor. You can move or delete it like normal text.</p>}
        {images && images.length === 0 && <p className="text-xs text-neutral-500">No freely licensed photos found. Try a shorter or different keyword.</p>}
        {images && images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <li key={img.pageUrl} className="overflow-hidden rounded-lg border border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnail */}
                <img src={img.thumbUrl} alt={img.title} loading="lazy" className="aspect-[4/3] w-full bg-neutral-900 object-cover" />
                <div className="space-y-1.5 p-2">
                  <p className="truncate text-xs" title={img.title}>{img.title}</p>
                  <p className="truncate text-[11px] text-neutral-500" title={`${img.author} · ${img.license}`}>
                    {img.author} · {img.license}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onInsert(commonsMarkdown(img, caption));
                      setInserted(img.title);
                    }}
                    className="btn-secondary w-full py-1 text-xs"
                  >
                    Insert
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
