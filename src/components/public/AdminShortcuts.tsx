"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Public pages are cached and the same for everyone, so admin-only links are added in the browser.
// Only browsers with the sign-in hint cookie ask the server; everyone else makes no extra request.
let adminPromise: Promise<{ name: string } | null> | undefined;
function useAdmin() {
  const [admin, setAdmin] = useState<{ name: string } | null>(null);
  useEffect(() => {
    if (!document.cookie.split("; ").includes("sb_admin=1")) return;
    adminPromise ??= fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { admin: null }))
      .then((d: { admin: { name: string } | null }) => d.admin)
      .catch(() => null);
    let alive = true;
    adminPromise.then((a) => alive && setAdmin(a));
    return () => {
      alive = false;
    };
  }, []);
  return admin;
}

/** Floating "Dashboard" button, shown only to signed-in admins. */
export function AdminDashboardButton() {
  const admin = useAdmin();
  if (!admin) return null;
  return (
    <Link
      href="/admin"
      title={`Signed in as ${admin.name}`}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/40 transition hover:bg-white"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-[10px] font-black">SB</span>
      Dashboard
    </Link>
  );
}

/** "Edit artikel" link on an article page, shown only to signed-in admins. */
export function AdminEditLink({ articleId }: { articleId: string }) {
  const admin = useAdmin();
  if (!admin) return null;
  return (
    <Link
      href={`/admin/articles/${articleId}/edit`}
      className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-950 hover:bg-white"
    >
      ✎ Edit artikel
    </Link>
  );
}
