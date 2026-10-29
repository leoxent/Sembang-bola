"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/ai-content", label: "AI drafts" },
  { href: "/admin/categories", label: "Categories", superOnly: true },
  { href: "/admin/team", label: "Team", superOnly: true },
];

export function AdminNav({ isSuper }: { isSuper: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 md:flex-col">
      {LINKS.filter((l) => isSuper || !l.superOnly).map(({ href, label }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-neutral-800 font-medium text-white" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
