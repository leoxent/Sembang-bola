"use client";

import { useEffect, useState } from "react";

const button =
  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ring-1 ring-neutral-800 transition hover:ring-neutral-600";

/** WhatsApp, Telegram, X and copy-link buttons. The address comes from the browser, so it's right on any domain. */
export function ShareButtons({ title, path, className = "" }: { title: string; path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + path), [path]);

  const enc = encodeURIComponent;
  const target = url ?? path;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title}\n${target}`)}`, className: "text-[#25D366]", icon: <WhatsAppIcon /> },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(target)}&text=${enc(title)}`, className: "text-[#2AABEE]", icon: <TelegramIcon /> },
    { label: "X", href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(target)}`, className: "text-neutral-200", icon: <XIcon /> },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin pautan ini:", target);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 text-sm font-semibold text-neutral-400">Kongsi:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={`${button} ${l.className}`} aria-label={`Kongsi di ${l.label}`}>
          {l.icon}
          <span className="hidden text-neutral-200 sm:inline">{l.label}</span>
        </a>
      ))}
      <button type="button" onClick={copy} className={`${button} text-neutral-200`}>
        <LinkIcon />
        {copied ? "Disalin!" : "Salin pautan"}
      </button>
    </div>
  );
}

const iconClass = "h-4 w-4 shrink-0";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
      <path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9-8.2c.4-.4-.1-.6-.6-.2L6.3 13.1l-4.8-1.5c-1-.3-1-1 .2-1.5L20.5 2.9c.9-.3 1.6.2 1.4 1.4Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
      <path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}
