import type { ArticleStatus, ContentOrigin } from "@prisma/client";

const STATUS_STYLES: Record<ArticleStatus, string> = {
  DRAFT: "bg-neutral-800 text-neutral-300",
  IN_REVIEW: "bg-amber-500/15 text-amber-300",
  SCHEDULED: "bg-sky-500/15 text-sky-300",
  PUBLISHED: "bg-emerald-500/15 text-emerald-300",
  ARCHIVED: "bg-neutral-800 text-neutral-500",
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: ContentOrigin }) {
  if (origin === "HUMAN") return null;
  return (
    <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
      {origin === "AI" ? "AI" : "AI · edited"}
    </span>
  );
}
