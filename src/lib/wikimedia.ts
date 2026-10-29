// Searches Wikimedia Commons for freely licensed photos (CC0, CC BY, CC BY-SA, public domain).
// Commons only hosts free-licence media, but most licences require credit, so every result carries
// the author and licence, and the inserted caption shows them.

const API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia asks API clients to identify themselves.
const HEADERS = { "User-Agent": "SembangBola/0.1 (personal non-commercial football site)" };

export interface CommonsImage {
  title: string; // e.g. "Luka Modric 2018"
  thumbUrl: string; // ~800px wide
  pageUrl: string; // the file's page on Commons (licence details)
  author: string;
  license: string; // e.g. "CC BY-SA 3.0"
  licenseUrl: string | null;
  width: number;
  height: number;
}

interface CommonsPage {
  title: string;
  index: number;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    url: string;
    descriptionurl: string;
    mime: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function searchCommons(query: string, limit = 12): Promise<CommonsImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "800",
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
  });
  const res = await fetch(`${API}?${params}`, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Wikimedia Commons ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: CommonsPage[] } };

  return (data.query?.pages ?? [])
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) return [];
      const meta = info.extmetadata ?? {};
      const license = stripHtml(meta.LicenseShortName?.value ?? "");
      if (!license) return []; // no licence information: skip rather than guess
      return [
        {
          title: p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
          thumbUrl: info.thumburl ?? info.url,
          pageUrl: info.descriptionurl,
          author: stripHtml(meta.Artist?.value ?? "") || "Unknown author",
          license,
          licenseUrl: meta.LicenseUrl?.value ?? null,
          width: info.thumbwidth ?? 0,
          height: info.thumbheight ?? 0,
        },
      ];
    });
}

/** Markdown for an in-article image with a credit caption, e.g. "*Luka Modrić. Foto: X / CC BY-SA 3.0, via Wikimedia Commons*". */
export function commonsMarkdown(img: CommonsImage, caption: string): string {
  const clean = (s: string) => s.replace(/[[\]*_]/g, "");
  const licence = img.licenseUrl ? `[${clean(img.license)}](${img.licenseUrl})` : clean(img.license);
  const lead = caption.trim() ? `${clean(caption.trim())}. ` : "";
  return `![${clean(caption || img.title)}](${img.thumbUrl})\n*${lead}Foto: [${clean(img.author)}](${img.pageUrl}) / ${licence}, via Wikimedia Commons*`;
}
